## Error Type
Build Error

## Error Message
Export updateItemStatus doesn't exist in target module

## Build Output
./app/admin/ClientAdminPage.tsx:7:1
Error: Export updateItemStatus doesn't exist in target module
   5 | import { StatusBadge } from '@/components/StatusBadge'
   6 | import ItemStatusSelect from '@/components/ItemStatusSelect'
>  7 | import { 
     | ^^^^^^^^
>  8 |     sendInvoice, 
     | ^^^^^^^^^^^^^^^^^
>  9 |     deleteInvoice, 
     | ^^^^^^^^^^^^^^^^^^^
> 10 |     shipOrder, 
     | ^^^^^^^^^^^^^^^
> 11 |     deleteShip, 
     | ^^^^^^^^^^^^^^^^
> 12 |     updateItemQuantity, 
     | ^^^^^^^^^^^^^^^^^^^^^^^^
> 13 |     updateItemPrice,
     | ^^^^^^^^^^^^^^^^^^^^
> 14 |     updateTrackingNumber,
     | ^^^^^^^^^^^^^^^^^^^^^^^^^
> 15 |     updateAdminNote,
     | ^^^^^^^^^^^^^^^^^^^^
> 16 |     cancelAdminNote,
     | ^^^^^^^^^^^^^^^^^^^^
> 17 |     updateOrderStatusToPaymentRequired,
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 18 |     updateItemStatus
     | ^^^^^^^^^^^^^^^^^^^^
> 19 | } from '@/app/actions/admin'
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  20 | import { SubmitButton } from '@/components/SubmitButtons'
  21 |
  22 | function getTrackingUrl(trackingNumber: string): string {

The export updateItemStatus was not found in module [project]/app/actions/admin.ts [app-client] (ecmascript).
Did you mean to import updateItemQuantity?
All exports of the module are statically known (It doesn't have dynamic exports). So it's known statically that the requested export doesn't exist.

Import trace:
  Server Component:
    ./app/admin/ClientAdminPage.tsx
    ./app/admin/page.tsx

Next.js version: 16.3.2 (Turbopack)
