import { useNavigate } from "react-router";

interface MessageCardProps {
    name: string;
    message: string;
}

export function MessageCard({ name, message }: MessageCardProps) {
    const navigate = useNavigate()

    function onMessage() {
        navigate('/message/user');
    }

    return (

        <div className="ds-surface grid grid-cols-1 gap-4 p-6 bg-blue-500 transition duration-200 ease-in-out hover:bg-blue-700 hover:scale-105" onClick={onMessage}>

            <div className="grid gap-1">
                <p className="ds-label">Sender Information</p>
                <p className="nums-tabular text-3xl font-semibold">{name}</p>
                <p className="nums-tabular text-2xl">{message}</p>
            </div>

        </div>

    )
}
