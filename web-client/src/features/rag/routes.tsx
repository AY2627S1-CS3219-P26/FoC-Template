import type { FeatureRoutes } from "@/lib/routing";
import { RagWindowPage } from "./pages/ragWindowPage";


export const ragRoutes: FeatureRoutes = {

    app: [
        { path: 'rag', Component: RagWindowPage },
    ],
}
