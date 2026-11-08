# UI guidance

Before any UI change, read and follow the [Waymark UI rules](../src/styles/agent.md). Complete the checklist there before committing.

## Page layout

- Settings and forms use a 640–720px content cap. Editors use approximately 760–820px.
- Lists and tables follow the available width with 24–32px desktop gutters, a maximum content width of approximately 1100px and left alignment. Align their content edge with the breadcrumb. Avoid large blank margins on both sides of list pages.
- Mobile pages use 16px gutters and reserve the bottom safe area.
- A list page uses one compact heading with its item count and an upload action aligned to the list's right edge.

## Lists

- Use one bordered container with zebra-striped rows. Keep desktop columns aligned across the header, all rows and all groups.
- Row backgrounds reference the shared :root --row-bg-odd, --row-bg-even, --row-bg-hover and --row-bg-selected tokens. Container and header borders reference --row-border. Derive these colors from existing surface, text and accent tokens.
- Compute stripes from the currently visible rows after searching or filtering. Each group's first row starts with the odd-row token.
- Keep a header and the same container for a single result. Desktop material rows are 52–56px high.
- Check text contrast of at least 4.5:1 on odd, even, hover and focused backgrounds.
- At 640px and below, hide the header and summary column. Show a single-line filename above type and date, retain stripes and a row height of at least 56px, and use a bottom action sheet.
