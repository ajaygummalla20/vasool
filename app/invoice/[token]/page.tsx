import PublicInvoicePage from './PublicInvoicePage'

export default async function PublicInvoiceRoute(
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  return <PublicInvoicePage invoiceId={token} />
}
