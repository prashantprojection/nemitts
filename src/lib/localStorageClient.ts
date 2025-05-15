/**
 * This file provides a replacement for the Supabase client
 * It uses localStorage to store and retrieve data
 */

// Define types for the local storage database
export type LocalStorageTable = {
  [key: string]: any[];
};

export type LocalStorageDatabase = {
  [tableName: string]: LocalStorageTable;
};

class LocalStorageClient {
  private prefix: string;
  private database: LocalStorageDatabase;

  constructor(prefix: string = 'nemitts-') {
    this.prefix = prefix;
    this.database = this.loadDatabase();
  }

  // Load the database from localStorage
  private loadDatabase(): LocalStorageDatabase {
    try {
      const dbString = localStorage.getItem(`${this.prefix}database`);
      return dbString ? JSON.parse(dbString) : {};
    } catch (error) {
      console.error('Error loading database from localStorage:', error);
      return {};
    }
  }

  // Save the database to localStorage
  private saveDatabase(): void {
    try {
      localStorage.setItem(`${this.prefix}database`, JSON.stringify(this.database));
    } catch (error) {
      console.error('Error saving database to localStorage:', error);
    }
  }

  // Initialize a table if it doesn't exist
  private initTable(tableName: string): void {
    if (!this.database[tableName]) {
      this.database[tableName] = {};
    }
  }

  // Get a reference to a table for querying
  from(tableName: string) {
    this.initTable(tableName);
    
    return {
      // Select data from the table
      select: (columns: string = '*') => {
        return {
          // Filter by equality
          eq: (column: string, value: any) => {
            return this.queryTable(tableName, columns, { [column]: value });
          },
          // Get all records
          execute: () => {
            return this.queryTable(tableName, columns, {});
          },
          // Get a single record
          single: () => {
            const result = this.queryTable(tableName, columns, {});
            return {
              data: result.data.length > 0 ? result.data[0] : null,
              error: null
            };
          },
          // Get a single record or null
          maybeSingle: () => {
            const result = this.queryTable(tableName, columns, {});
            return {
              data: result.data.length > 0 ? result.data[0] : null,
              error: null
            };
          }
        };
      },
      // Insert data into the table
      insert: (data: any) => {
        return {
          select: (returnColumns: string = '*') => {
            const result = this.insertIntoTable(tableName, data);
            return {
              ...result,
              single: () => ({
                data: result.data,
                error: result.error
              })
            };
          }
        };
      },
      // Update data in the table
      update: (data: any) => {
        return {
          eq: (column: string, value: any) => {
            return this.updateTable(tableName, data, { [column]: value });
          },
          match: (conditions: Record<string, any>) => {
            return this.updateTable(tableName, data, conditions);
          }
        };
      },
      // Upsert data in the table (insert or update)
      upsert: (data: any, options?: { onConflict?: string }) => {
        const conflictColumn = options?.onConflict || 'id';
        return this.upsertTable(tableName, data, conflictColumn);
      },
      // Delete data from the table
      delete: () => {
        return {
          eq: (column: string, value: any) => {
            return this.deleteFromTable(tableName, { [column]: value });
          },
          match: (conditions: Record<string, any>) => {
            return this.deleteFromTable(tableName, conditions);
          }
        };
      }
    };
  }

  // Query data from a table
  private queryTable(tableName: string, columns: string, conditions: Record<string, any>) {
    try {
      const table = this.database[tableName] || {};
      const records = Object.values(table);
      
      // Filter records based on conditions
      const filteredRecords = records.filter(record => {
        return Object.entries(conditions).every(([key, value]) => {
          return record[key] === value;
        });
      });
      
      // Select only requested columns if not '*'
      let selectedRecords = filteredRecords;
      if (columns !== '*') {
        const columnList = columns.split(',').map(c => c.trim());
        selectedRecords = filteredRecords.map(record => {
          const newRecord: Record<string, any> = {};
          columnList.forEach(column => {
            newRecord[column] = record[column];
          });
          return newRecord;
        });
      }
      
      return {
        data: selectedRecords,
        error: null
      };
    } catch (error) {
      console.error(`Error querying table ${tableName}:`, error);
      return {
        data: null,
        error: {
          message: `Error querying table ${tableName}: ${error}`
        }
      };
    }
  }

  // Insert data into a table
  private insertIntoTable(tableName: string, data: any) {
    try {
      this.initTable(tableName);
      const table = this.database[tableName];
      
      // Generate an ID if not provided
      const record = {
        ...data,
        id: data.id || this.generateId(),
        created_at: data.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Add the record to the table
      table[record.id] = record;
      this.saveDatabase();
      
      return {
        data: record,
        error: null
      };
    } catch (error) {
      console.error(`Error inserting into table ${tableName}:`, error);
      return {
        data: null,
        error: {
          message: `Error inserting into table ${tableName}: ${error}`
        }
      };
    }
  }

  // Update data in a table
  private updateTable(tableName: string, data: any, conditions: Record<string, any>) {
    try {
      const table = this.database[tableName] || {};
      const records = Object.values(table);
      let updated = false;
      
      // Find and update records that match the conditions
      records.forEach(record => {
        const matches = Object.entries(conditions).every(([key, value]) => {
          return record[key] === value;
        });
        
        if (matches) {
          const updatedRecord = {
            ...record,
            ...data,
            updated_at: new Date().toISOString()
          };
          
          table[record.id] = updatedRecord;
          updated = true;
        }
      });
      
      this.saveDatabase();
      
      return {
        data: updated ? { updated: true } : null,
        error: null
      };
    } catch (error) {
      console.error(`Error updating table ${tableName}:`, error);
      return {
        data: null,
        error: {
          message: `Error updating table ${tableName}: ${error}`
        }
      };
    }
  }

  // Upsert data in a table (insert or update)
  private upsertTable(tableName: string, data: any, conflictColumn: string) {
    try {
      this.initTable(tableName);
      const table = this.database[tableName];
      const records = Object.values(table);
      
      // Check if a record with the conflict column value exists
      const existingRecord = records.find(record => {
        return record[conflictColumn] === data[conflictColumn];
      });
      
      if (existingRecord) {
        // Update the existing record
        const updatedRecord = {
          ...existingRecord,
          ...data,
          updated_at: new Date().toISOString()
        };
        
        table[existingRecord.id] = updatedRecord;
      } else {
        // Insert a new record
        const newRecord = {
          ...data,
          id: data.id || this.generateId(),
          created_at: data.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        table[newRecord.id] = newRecord;
      }
      
      this.saveDatabase();
      
      return {
        data: { upserted: true },
        error: null
      };
    } catch (error) {
      console.error(`Error upserting into table ${tableName}:`, error);
      return {
        data: null,
        error: {
          message: `Error upserting into table ${tableName}: ${error}`
        }
      };
    }
  }

  // Delete data from a table
  private deleteFromTable(tableName: string, conditions: Record<string, any>) {
    try {
      const table = this.database[tableName] || {};
      const records = Object.values(table);
      let deleted = false;
      
      // Find and delete records that match the conditions
      records.forEach(record => {
        const matches = Object.entries(conditions).every(([key, value]) => {
          return record[key] === value;
        });
        
        if (matches) {
          delete table[record.id];
          deleted = true;
        }
      });
      
      this.saveDatabase();
      
      return {
        data: deleted ? { deleted: true } : null,
        error: null
      };
    } catch (error) {
      console.error(`Error deleting from table ${tableName}:`, error);
      return {
        data: null,
        error: {
          message: `Error deleting from table ${tableName}: ${error}`
        }
      };
    }
  }

  // Generate a unique ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  // Auth methods to replace Supabase auth
  auth = {
    // Get the current user
    getUser: async () => {
      try {
        const userString = localStorage.getItem(`${this.prefix}user`);
        const user = userString ? JSON.parse(userString) : null;
        
        return {
          data: { user },
          error: null
        };
      } catch (error) {
        console.error('Error getting user:', error);
        return {
          data: { user: null },
          error: {
            message: `Error getting user: ${error}`
          }
        };
      }
    },
    
    // Sign in with password (simulated)
    signInWithPassword: async ({ email, password }: { email: string, password: string }) => {
      try {
        // In a real app, this would validate credentials
        // Here we just store the email as the user
        const user = {
          id: this.generateId(),
          email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        localStorage.setItem(`${this.prefix}user`, JSON.stringify(user));
        
        return {
          data: { user },
          error: null
        };
      } catch (error) {
        console.error('Error signing in:', error);
        return {
          data: { user: null },
          error: {
            message: `Error signing in: ${error}`
          }
        };
      }
    },
    
    // Sign up (simulated)
    signUp: async ({ email, password, options }: { email: string, password: string, options?: any }) => {
      try {
        // In a real app, this would create a new user
        // Here we just store the email as the user
        const user = {
          id: this.generateId(),
          email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_metadata: options?.data || {}
        };
        
        localStorage.setItem(`${this.prefix}user`, JSON.stringify(user));
        
        return {
          data: { user },
          error: null
        };
      } catch (error) {
        console.error('Error signing up:', error);
        return {
          data: { user: null },
          error: {
            message: `Error signing up: ${error}`
          }
        };
      }
    },
    
    // Sign out
    signOut: async () => {
      try {
        localStorage.removeItem(`${this.prefix}user`);
        
        return {
          error: null
        };
      } catch (error) {
        console.error('Error signing out:', error);
        return {
          error: {
            message: `Error signing out: ${error}`
          }
        };
      }
    }
  };
}

// Create and export a singleton instance
export const localStorageClient = new LocalStorageClient();
