import { WebSocket, WebSocketServer } from "ws";

const PORT = 8080;

const wss = new WebSocketServer({ port: PORT });

let senderSocket: WebSocket | null = null;
let receiverSocket: WebSocket | null = null;

wss.on("connection", (socket) => {
    console.log("New client connected");

    socket.on("error", (error) => {
        console.error(error);
    });

    socket.on("close", () => {
        if (socket === senderSocket) {
            console.log("Sender disconnected");
            senderSocket = null;
        }

        if (socket === receiverSocket) {
            console.log("Receiver disconnected");
            receiverSocket = null;
        }
    });

    socket.on("message", (data) => {
        const message = JSON.parse(data.toString());

        switch (message.type) {
            case "sender":
                senderSocket = socket;
                console.log("Sender registered");
                break;

            case "receiver":
                receiverSocket = socket;
                console.log("Receiver registered");
                break;

            case "createOffer":
                if (socket !== senderSocket) return;

                console.log("Forwarding offer");

                receiverSocket?.send(
                    JSON.stringify({
                        type: "createOffer",
                        sdp: message.sdp,
                    })
                );
                break;

            case "createAnswer":
                if (socket !== receiverSocket) return;

                console.log("Forwarding answer");

                senderSocket?.send(
                    JSON.stringify({
                        type: "createAnswer",
                        sdp: message.sdp,
                    })
                );
                break;

            case "iceCandidate":
                console.log("Forwarding ICE candidate");

                if (socket === senderSocket) {
                    receiverSocket?.send(
                        JSON.stringify({
                            type: "iceCandidate",
                            candidate: message.candidate,
                        })
                    );
                } else if (socket === receiverSocket) {
                    senderSocket?.send(
                        JSON.stringify({
                            type: "iceCandidate",
                            candidate: message.candidate,
                        })
                    );
                }

                break;

            default:
                console.warn(`Unknown message type: ${message.type}`);
        }
    });
});

console.log(`Signaling server running on ws://localhost:${PORT}`);