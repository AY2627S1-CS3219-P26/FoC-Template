
//import { request } from '@/lib/http'


export function useMessageConversation() {
    return "useQuery"
}

export function useUserContacts() {
    return 4;
    // return useQuery({
    //     queryKey: ['user', 'messages'],
    //     queryFn: request<"ContactInfo">("message", "/message", {})
    //     //placeholderData: keepPreviousData,
    // })
}
