## Diagnóstico

Verifiquei o banco e a história do Arthur **não existe** na tabela `stories`. Últimas 7 histórias salvas são todas anteriores (a mais recente é "O Segredo da Coruja Luar" de 05/06).

Isso aconteceu por causa do fluxo atual do gerador:

```
/admin/gerar  →  botão "Enviar"  →  salva em sessionStorage
              →  navega para /admin
              →  abre o StorySheet (painel lateral) com o rascunho
              →  *** usuário precisa clicar "Salvar na Biblioteca" ***
              →  só aí é gravado no Supabase via upsert
```

Provavelmente o painel abriu, mas a história foi fechada/perdida antes de clicar em **Salvar na Biblioteca** (ou recarregaram a página — o `sessionStorage` foi limpo no `useEffect` antes de salvar). Resultado: a história nunca chega no banco, então não aparece nem em `/admin` nem em `/` (biblioteca).

## Plano de correção

**Objetivo:** o botão "Enviar" no gerador deve salvar a história direto no banco (com upsert), sem depender de um segundo clique. O painel de revisão continua disponível, mas só para edições posteriores.

### Mudanças

1. **`src/routes/admin.gerar.tsx` — função `sendToSheet`**
   - Renomear para `saveAndExit` (ou similar).
   - Antes de navegar, fazer `supabase.from("stories").upsert(payload)` com o mesmo shape que o `StorySheet` usa (title, subtitle, date, emoji, tags, cover_url, pages, character_sheet, soundtrack_*, updated_at).
   - Validar mínimos: título obrigatório, pelo menos 1 página.
   - Em caso de erro do Supabase, mostrar toast e **não** navegar (assim o usuário não perde o trabalho).
   - Em sucesso: toast "✅ História salva na biblioteca" e navegar para `/admin`.
   - Manter o `sessionStorage.setItem("contame:pendingStory", ...)` como **fallback** apenas se o upsert falhar — assim o painel ainda reabre com o rascunho para tentativa manual.

2. **`src/routes/admin.index.tsx`**
   - Pequeno ajuste: ao detectar `pendingStory` no sessionStorage, mostrar toast informativo ("Rascunho recuperado — salve para concluir") em vez do atual "Rascunho gerado — revise e salve", deixando claro que é recuperação de falha.

3. **Sem mudanças** em `StorySheet.tsx`, schema do banco, RLS ou tipos.

### Verificação

Após implementar:
- Gerar uma nova historinha de teste com Arthur em `/admin/gerar`, clicar "Enviar".
- Confirmar via `psql` que a linha aparece em `public.stories`.
- Confirmar que ela aparece em `/admin` e em `/` (biblioteca) na data de hoje.

### Observação sobre a história perdida

Infelizmente o rascunho do Arthur já se perdeu — `sessionStorage` é por aba e foi limpo. Você vai precisar gerá-la novamente. Com a correção acima, isso não vai mais acontecer.
