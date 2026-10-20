import { io } from "socket.io-client";

const socket = io("http://localhost:3008");

socket.on("connect", () => {
    console.log("Connected to server!");
    console.log("Socket ID:", socket.id);

    socket.emit("heartbeat");
});

socket.on("heartbeat:ack", (data) => {
    console.log("Heartbeat response:", data);
});

socket.on("connect_error", (error) => {
    console.error("Connection failed:", error.message);
});
