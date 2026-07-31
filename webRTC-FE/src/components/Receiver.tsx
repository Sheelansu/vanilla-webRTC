import { useEffect } from "react";

export const Receiver = () => {
    useEffect(() => {
        const socket = new WebSocket("ws://localhost:8080");

        socket.onopen = () => {
            socket.send(
                JSON.stringify({
                    type: "identify-as-receiver",
                })
            );
        };

        startReceiving(socket);

        return () => {
            socket.close();
        };
    }, []);

    const startReceiving = (socket: WebSocket) => {
        const video = document.createElement("video");
        video.autoplay = true;
        video.playsInline = true;

        document.body.appendChild(video);

        const pc = new RTCPeerConnection();

        pc.ontrack = (event) => {
            console.log("Track received:", event);

            video.srcObject = new MediaStream([event.track]);
        };

        pc.onicecandidate = (event) => {
            if (!event.candidate) return;

            socket.send(
                JSON.stringify({
                    type: "ice-candidate",
                    candidate: event.candidate,
                })
            );
        };

        socket.onmessage = async (event) => {
            const message = JSON.parse(event.data);

            switch (message.type) {
                case "create-offer":
                    await pc.setRemoteDescription(message.sdp);

                    const answer = await pc.createAnswer();

                    await pc.setLocalDescription(answer);

                    socket.send(
                        JSON.stringify({
                            type: "create-answer",
                            sdp: answer,
                        })
                    );
                    break;

                case "ice-candidate":
                    if (pc.remoteDescription) {
                    await pc.addIceCandidate(message.candidate);
                }
                    break;

                default:
                    console.warn("Unknown message type:", message.type);
            }
        };
    };

    return <div>Receiver</div>;
};