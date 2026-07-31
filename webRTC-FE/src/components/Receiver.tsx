import { useEffect, useRef } from "react";

export const Receiver = () => {
    const socketRef = useRef<WebSocket | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        const socket = new WebSocket("ws://localhost:8080");
        socketRef.current = socket;

        socket.onopen = () => {
            socket.send(
                JSON.stringify({
                    type: "identify-as-receiver",
                })
            );

            startReceiving(socket);
        };

        return () => {
            socket.close();
            pcRef.current?.close();
        };
    }, []);

    const startReceiving = (socket: WebSocket) => {
        const peerConnection = new RTCPeerConnection();
        pcRef.current = peerConnection;

        const video = document.createElement("video");
        video.autoplay = true;
        video.playsInline = true;
        document.body.appendChild(video);
        videoRef.current = video;

        peerConnection.ontrack = (event) => {
            video.srcObject = event.streams[0];
        };

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.send(
                    JSON.stringify({
                        type: "ice-candidate",
                        candidate: event.candidate,
                    })
                );
            }
        };

        socket.onmessage = async (event) => {
            const message = JSON.parse(event.data);

            switch (message.type) {
                case "create-offer":
                    await peerConnection.setRemoteDescription(message.sdp);

                    const answer = await peerConnection.createAnswer();
                    await peerConnection.setLocalDescription(answer);

                    socket.send(
                        JSON.stringify({
                            type: "create-answer",
                            sdp: peerConnection.localDescription,
                        })
                    );
                    break;

                case "ice-candidate":
                    await peerConnection.addIceCandidate(message.candidate);
                    break;

                default:
                    console.warn("Unknown message type:", message.type);
            }
        };
    };

    return <div>Receiver</div>;
};