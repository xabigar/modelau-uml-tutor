# Development set (tuning of ModelaU's prompt; not part of the reported study)

Three further class diagrams (D1 school: Teacher/Student not generalized to Person; E1 hotel: Room missing;
F1 shop: Invoice missing), 2 questions x 3 runs = 18 replies per prompt version, same model as the study.
"Defect addressed" below is the first coder's reading of whether the reply points at the seeded defect, even as a hint
(to be confirmed the same way as in the study). Replies are in the .jsonl files of this folder.

| Version | Change | Defect addressed | Notes |
|---|---|---|---|
| v1 | the prompt evaluated first (priority to the inferred step); no element names in the context | 6/18 (D1 2, E1 0, F1 4) | replies stuck on "methods" |
| v2 | structural problems evident from the text take precedence over the step; element names in the context | 10/18 (D1 0, E1 4, F1 6) |  |
| v3 | + "before saying that something is missing, check the code" | 11/18 (D1 2, E1 4, F1 5) | chosen as final (`prompt-v3-final.md`) |
| v4 | + "compare the text with the code sentence by sentence" | about 8/18 (D1 0, E1 3, F1 5) | fewer defects addressed than v3; rejected |

The final prompt (v3 text) is the ModelaU v2 of the study (`../en/prompt-modelau-v2.md`); v1 is `../en/prompt-modelau-v1.md`.
Server-side change (not part of the prompt rounds): references are resolved tolerantly (quotes, case, relationship lines
standing for the elements at their ends); on the same 96 v1 references the old exact-match rule discarded 16, the new one none.
