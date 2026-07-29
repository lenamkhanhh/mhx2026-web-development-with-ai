# TripFlow authorization matrix

The UI may hide actions for convenience, but Firestore Security Rules remain
the enforcement boundary.

| Action | Lead | Member |
| --- | --- | --- |
| Read a trip they belong to | yes | yes |
| Create a trip | yes, as creator | yes, as creator |
| Join with valid join code | n/a | yes |
| Create an event | yes, approved | yes, pending |
| Edit own pending event | n/a | yes |
| Edit any event | yes | no |
| Approve/cancel an event | yes | no |
| Reorder events | yes | no |
| Update own responsibility | yes | yes |
| Remove another member | yes | no |
| Create an expense | yes | yes |
| Edit/delete another user's expense | yes | no |
| Mark an expense record settled | yes | no |
| Sync `happening`/`completed` status | yes | no |

Never trust a client-provided `role`, `leadId`, or membership flag without
checking the stored trip/member documents in rules and in the repository.

`settled` is a lead-controlled internal ledger state. It records that the group
has reconciled the item; it is not a bank-transfer receipt or payment proof.
