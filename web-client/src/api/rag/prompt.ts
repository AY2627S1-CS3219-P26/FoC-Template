
import { request } from '@/lib/http'


export interface queryResponse {
    query: string,
    response: string,
}


export async function postPrompt(prompt: string, conversations: string[]) {
    try {
        const body = {
            query: prompt,
            conversations
        }
        const method = 'POST';
        return await request<queryResponse>('rag', '/query/', { method, body })
    } catch {
        // The composer shows its own fallback answer when there is no response.
        return undefined
    }
}
