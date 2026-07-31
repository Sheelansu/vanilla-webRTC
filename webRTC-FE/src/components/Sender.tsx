import { useEffect, useState } from "react";

export const Sender = () => {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [peerConnection, setPeerConnection] =
        useState<RTCPeerConnection | null>(null);

    useEffect(() => {
        const ws = new WebSocket("ws://localhost:8080");

        setSocket(ws);

        ws.onopen = () => {
            ws.send(
                JSON.stringify({
                    type: "identify-as-sender",
                })
            );
        };

        return () => {
            ws.close();
            peerConnection?.close();
        };
    }, []);

    const initiateConn = async () => {
        if (!socket) {
            alert("Socket not found");
            return;
        }

        const pc = new RTCPeerConnection();
        setPeerConnection(pc);

        socket.onmessage = async (event) => {
            const message = JSON.parse(event.data);

            switch (message.type) {
                case "create-answer":
                    await pc.setRemoteDescription(message.sdp);
                    break;

                case "ice-candidate":
                    await pc.addIceCandidate(message.candidate);
                    break;

                default:
                    console.warn("Unknown message type:", message.type);
            }
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

        pc.onnegotiationneeded = async () => {
            console.log("Negotiation needed");

            const offer = await pc.createOffer();

            await pc.setLocalDescription(offer);

            socket.send(
                JSON.stringify({
                    type: "create-offer",
                    sdp: pc.localDescription,
                })
            );
        };

        await getCameraStreamAndSend(pc);
    };

    const getCameraStreamAndSend = async (
        pc: RTCPeerConnection
    ): Promise<void> => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
            });

            const video = document.createElement("video");
            video.srcObject = stream;
            video.autoplay = true;
            video.playsInline = true;
            video.muted = true;

            document.body.appendChild(video);

            stream.getTracks().forEach((track) => {
                console.log("Track added:", track.kind);
                pc.addTrack(track);
            });
        } catch (error) {
            console.error("Failed to access camera:", error);
        }
    };

    return (
        <div>
            <h2>Sender</h2>
            <button onClick={initiateConn}>Send Data</button>
        </div>
    );
};