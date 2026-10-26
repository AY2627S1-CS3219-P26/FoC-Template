import type { FeatureRoutes } from "@/lib/routing";
import { MessagePage } from "./pages/MessagePage";

export const messageRoutes: FeatureRoutes = {

    app: [{ path: 'message', Component: MessagePage }],
}
