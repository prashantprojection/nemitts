import speechService from "./SpeechService";

class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private serverUrl: string = "ws://localhost:8910";
  private isConnected: boolean = false;

  constructor() {
    this.connect();
  }

  public connect(): void {
    // Clear any existing reconnect timer
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    try {
      this.socket = new WebSocket(this.serverUrl);

      this.socket.onopen = () => {
        console.log("WebSocket connected");
        this.isConnected = true;
        this.sendState();
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      this.socket.onclose = () => {
        console.log("WebSocket disconnected");
        this.isConnected = false;
        
        // Attempt to reconnect after 5 seconds
        this.reconnectTimer = window.setTimeout(() => {
          this.connect();
        }, 5000);
      };

      this.socket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    } catch (error) {
      console.error("Error creating WebSocket:", error);
    }
  }

  private handleMessage(message: any): void {
    switch (message.type) {
      case "state":
        this.handleStateUpdate(message.data);
        break;
      default:
        console.warn("Unknown message type:", message.type);
    }
  }

  private handleStateUpdate(state: any): void {
    // Handle mute state
    if (state.muted !== undefined && state.muted !== speechService.getMuteState()) {
      speechService.toggleMute();
    }

    // Handle skip command
    if (state.skipCurrent) {
      speechService.skipCurrent();
    }

    // Handle clear command
    if (state.clearQueue) {
      speechService.stop();
    }
  }

  public sendState(): void {
    if (!this.isConnected || !this.socket) return;

    const state = {
      muted: speechService.getMuteState(),
      queue: speechService.getQueue(),
      currentMessage: speechService.getCurrentMessage()
    };

    this.socket.send(JSON.stringify({
      type: "updateState",
      data: state
    }));
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

// Create a singleton instance
const webSocketService = new WebSocketService();

export default webSocketService;
