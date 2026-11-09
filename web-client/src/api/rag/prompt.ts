
import { request } from '@/lib/http'
import type { Message } from '../message/types';


export interface queryResponse {
    query: string,
    response: string,
}


export async function postPrompt(prompt: string, messages: Message[]) {
    try {
        const body = {
            query: prompt,
            conversations: messages.map((m) => m.content)
        }
        const method = 'POST';
        return await request<queryResponse>('rag', '/query/', { method, body })
    } catch (e) {

    }
}

// export async function getPrompt(prompt: string) {
//     const query = prompt
//     try {
        
//         const method = 'GET';
//         return await request<queryResponse>('rag', '/query/', { method, query })
//     } catch (e) {

//     }
// }
