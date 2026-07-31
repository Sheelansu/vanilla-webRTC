import { useEffect, useRef } from "react";

export const Sender = () => {
    const socketRef = useRef<WebSocket | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);

    useEffect(() => {
        const socket = new WebSocket("ws://localhost:8080");
        socketRef.current = socket;

        socket.onopen = () => {
            socket.send(
                JSON.stringify({
                    type: "identify-as-sender",
                })
            );
        };

        socket.onmessage = async (event) => {
            const message = JSON.parse(event.data);

            if (!pcRef.current) return;

            switch (message.type) {
                case "create-answer":
                    await pcRef.current.setRemoteDescription(message.sdp);
                    break;

                case "ice-candidate":
                    await pcRef.current.addIceCandidate(message.candidate);
                    break;
            }
        };

        return () => {
            socket.close();
            pcRef.current?.close();
        };
    }, []);

    const initiateConn = async () => {
        if (!socketRef.current) {
            alert("Socket not connected");
            return;
        }

        const peerConnection = new RTCPeerConnection();
        pcRef.current = peerConnection;

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socketRef.current?.send(
                    JSON.stringify({
                        type: "ice-candidate",
                        candidate: event.candidate,
                    })
                );
            }
        };

        peerConnection.onnegotiationneeded = async () => {
            const offer = await peerConnection.createOffer();

            await peerConnection.setLocalDescription(offer);

            socketRef.current?.send(
                JSON.stringify({
                    type: "create-offer",
                    sdp: peerConnection.localDescription,
                })
            );
        };

        getCameraStreamAndSend(peerConnection);
    };

    const getCameraStreamAndSend = async (
        peerConnection: RTCPeerConnection
    ) => {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
        });

        const video = document.createElement("video");
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        document.body.appendChild(video);

        stream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, stream);
        });
    };

    return (
        <div>
            <h2>Sender</h2>
            <button onClick={initiateConn}>Send Data</button>
        </div>
    );
};