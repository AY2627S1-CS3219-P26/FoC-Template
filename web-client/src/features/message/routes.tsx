import type { FeatureRoutes } from "@/lib/routing";
import { MessagePage } from "./pages/MessagePage";
import { SocketMessagePage } from "./pages/SocketMessagePage";

export const messageRoutes: FeatureRoutes = {

    app: [
        { path: 'message', Component: MessagePage },
        { path: 'message/user', Component: SocketMessagePage }
    ],
}
