import { Link } from 'react-router'

export function RagCard() {
    return (
        <li>
            <Link to={`/rag`} className="flex items-start justify-between gap-3 p-4">
                <div className="grid min-w-0 grid-cols-1 gap-1">
                    <p className="font-semibold wrap-anywhere">{"Rag Model"}</p>
                    <p className="text-muted wrap-anywhere">{"Ask anything you want"}</p>
                </div>
            </Link>
        </li>
    )
}
