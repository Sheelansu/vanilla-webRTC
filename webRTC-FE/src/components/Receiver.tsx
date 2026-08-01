import { useEffect, useRef } from "react";

const SIGNALING_SERVER_URL = "ws://localhost:8080";

export const Receiver = () => {
    const socketRef = useRef<WebSocket | null>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        const socket = new WebSocket(SIGNALING_SERVER_URL);
        socketRef.current = socket;

        socket.onopen = () => {
            socket.send(
                JSON.stringify({
                    type: "receiver",
                })
            );

            initializePeerConnection(socket);
        };

        return () => {
            socket.close();
            peerConnectionRef.current?.close();
        };
    }, []);

    const initializePeerConnection = (socket: WebSocket) => {
        const peerConnection = new RTCPeerConnection();
        peerConnectionRef.current = peerConnection;

        registerPeerConnectionEvents(peerConnection);
        registerSocketEvents(peerConnection, socket);
    };

    const registerPeerConnectionEvents = (
        peerConnection: RTCPeerConnection
    ) => {
        peerConnection.ontrack = (event) => {
            console.log("Remote track received", event);

            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = new MediaStream([
                    event.track,
                ]);
            }
        };

        peerConnection.onicecandidate = (event) => {
            if (!event.candidate || !socketRef.current) return;

            socketRef.current.send(
                JSON.stringify({
                    type: "iceCandidate",
                    candidate: event.candidate,
                })
            );
        };
    };

    const registerSocketEvents = (
        peerConnection: RTCPeerConnection,
        socket: WebSocket
    ) => {
        socket.onmessage = async (event) => {
            const message = JSON.parse(event.data);

            switch (message.type) {
                case "createOffer": {
                    await peerConnection.setRemoteDescription(message.sdp);

                    const answer = await peerConnection.createAnswer();

                    await peerConnection.setLocalDescription(answer);

                    socket.send(
                        JSON.stringify({
                            type: "createAnswer",
                            sdp: answer,
                        })
                    );

                    break;
                }

                case "iceCandidate":
                    await peerConnection.addIceCandidate(message.candidate);
                    break;

                default:
                    console.warn("Unknown message type:", message.type);
            }
        };
    };

    return (
        <div>
            <h2>Receiver</h2>

            <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                controls={false}
                width={800}
            />
        </div>
    );
};