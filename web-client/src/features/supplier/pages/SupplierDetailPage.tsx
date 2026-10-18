import { useParams } from 'react-router'
import { PlaceholderPage } from '@/components/PlaceholderPage'

export function SupplierDetailPage() {
  // The :id from the route 'suppliers/:id', e.g. /suppliers/42 gives "42".
  const { id } = useParams()
  return (
    <PlaceholderPage
      title={`Supplier ${id}`}
      owner="supplier-service"
      file="src/features/supplier/pages/SupplierDetailPage.tsx"
    />
  )
}
