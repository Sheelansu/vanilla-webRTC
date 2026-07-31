import { WebSocketServer, WebSocket } from "ws"

const wss = new WebSocketServer({ port: 8080 });

type wsType = null |  WebSocket
let senderWebSocket: wsType = null;
let receiverWebSocket: wsType = null;

wss.on("connection", (ws) => {
    ws.on("error", console.error);

    ws.on("message", (data: any) => {
        const message = JSON.parse(data);

        switch (message.type) {
            case "identify-as-sender":
                senderWebSocket = ws;
                break;

            case "identify-as-receiver":
                receiverWebSocket = ws;
                break;

            case "create-offer":
                receiverWebSocket?.send(
                    JSON.stringify({
                        type: "offer",
                        offer: message.offer,
                    })
                );
                break;

            case "create-answer":
                senderWebSocket?.send(
                    JSON.stringify({
                        type: "answer",
                        answer: message.answer,
                    })
                );
                break;

            case "ice-candidate":
                if (ws === senderWebSocket) {
                    receiverWebSocket?.send(
                        JSON.stringify({
                            type: "ice-candidate",
                            candidate: message.candidate,
                        })
                    );
                } else if (ws === receiverWebSocket) {
                    senderWebSocket?.send(
                        JSON.stringify({
                            type: "ice-candidate",
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