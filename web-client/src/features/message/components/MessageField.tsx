interface MessageFieldProps {
    position: "left" | "right";
    content: string;
    timestamp: Date | string;
}

export function MessageField({ position, content, timestamp }: MessageFieldProps) {
    const isRight = position === "right";

    const date = new Date(timestamp);
    const time = isNaN(date.getTime())
        ? ""
        : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    return (
        <div className={`flex w-full ${isRight ? "justify-end" : "justify-start"}`}>
            <div
                className={`ds-surface grid grid-cols-1 gap-4 p-6 max-w-[70%] transition duration-200 ease-in-out hover:scale-[1.02] ${isRight ? "bg-blue-500 hover:bg-blue-700" : "bg-gray-500 hover:bg-gray-700"
                    }`}
            >
                <div className="grid gap-1">
                    <p className="ds-label">{content}</p>
                    <p className="nums-tabular text-sm opacity-70">{time}</p>
                </div>
            </div>
        </div>
    );
}
