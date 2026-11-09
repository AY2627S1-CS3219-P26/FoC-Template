import type { FeatureRoutes } from "@/lib/routing";
import { MessagePage } from "./pages/MessagePage";
import { MessageWindowPage } from "./pages/MessageWindowPage";
import { RagWindowPage } from "./pages/RagWindowPage";

export const messageRoutes: FeatureRoutes = {

    app: [
        { path: 'message', Component: MessagePage },
        { path: 'message/:id', Component: MessageWindowPage },
        { path: 'rag', Component: RagWindowPage },
    ],
}
