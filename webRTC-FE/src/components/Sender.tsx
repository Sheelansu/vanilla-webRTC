import { useEffect, useRef } from "react";

const SIGNALING_SERVER_URL = "ws://localhost:8080";

export const Sender = () => {
    const socketRef = useRef<WebSocket | null>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const localVideoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        const socket = new WebSocket(SIGNALING_SERVER_URL);
        socketRef.current = socket;

        socket.onopen = () => {
            socket.send(
                JSON.stringify({
                    type: "sender",
                })
            );
        };

        return () => {
            socket.close();
            peerConnectionRef.current?.close();
        };
    }, []);

    const initiateConnection = async () => {
        const socket = socketRef.current;

        if (!socket) {
            alert("Socket not connected.");
            return;
        }

        const peerConnection = new RTCPeerConnection();
        peerConnectionRef.current = peerConnection;

        registerPeerConnectionEvents(peerConnection, socket);
        registerSocketEvents(peerConnection, socket);

        await startLocalStream(peerConnection);
    };

    const registerSocketEvents = (
        peerConnection: RTCPeerConnection,
        socket: WebSocket
    ) => {
        socket.onmessage = async (event) => {
            const message = JSON.parse(event.data);

            switch (message.type) {
                case "createAnswer":
                    await peerConnection.setRemoteDescription(message.sdp);
                    break;

                case "iceCandidate":
                    await peerConnection.addIceCandidate(message.candidate);
                    break;

                default:
                    console.warn("Unknown message:", message.type);
            }
        };
    };

    const registerPeerConnectionEvents = (
        peerConnection: RTCPeerConnection,
        socket: WebSocket
    ) => {
        peerConnection.onicecandidate = (event) => {
            if (!event.candidate) return;

            socket.send(
                JSON.stringify({
                    type: "iceCandidate",
                    candidate: event.candidate,
                })
            );
        };

        peerConnection.onnegotiationneeded = async () => {
            console.log("Negotiation needed");

            const offer = await peerConnection.createOffer();

            await peerConnection.setLocalDescription(offer);

            socket.send(
                JSON.stringify({
                    type: "createOffer",
                    sdp: peerConnection.localDescription,
                })
            );
        };
    };

    const startLocalStream = async (
        peerConnection: RTCPeerConnection
    ) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            stream.getTracks().forEach((track) => {
                peerConnection.addTrack(track);
            });
        } catch (error) {
            console.error("Unable to access media devices:", error);
        }
    };

    return (
        <div>
            <h2>Sender</h2>

            <button onClick={initiateConnection}>
                Send Data
            </button>

            <br />
            <br />

            <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                width={400}
            />
        </div>
    );
};