import type { FeatureRoutes } from "@/lib/routing";
import { RagWindowPage } from "./pages/RagWindowPage";


export const ragRoutes: FeatureRoutes = {

    app: [
        { path: 'rag', Component: RagWindowPage },
    ],
}
