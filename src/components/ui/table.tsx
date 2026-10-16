import React from "react";

export const Table = React.forwardRef<HTMLTableElement, React.TableHTMLAttributes<HTMLTableElement>>(
  ({ className = "", children, ...props }, ref) => (
    <div className="w-full overflow-x-auto rounded-[8px] border border-border bg-surface">
      <table ref={ref} className={`w-full text-left text-sm text-text border-collapse ${className}`} {...props}>
        {children}
      </table>
    </div>
  )
);
Table.displayName = "Table";

export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className = "", children, ...props }, ref) => (
  <thead ref={ref} className={`sticky top-0 z-10 bg-bg-subtle border-b border-border text-xs text-text-muted font-medium ${className}`} {...props}>
    {children}
  </thead>
));
TableHeader.displayName = "TableHeader";

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className = "", children, ...props }, ref) => (
  <tbody ref={ref} className={`divide-y divide-border/60 ${className}`} {...props}>
    {children}
  </tbody>
));
TableBody.displayName = "TableBody";

export const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className = "", children, ...props }, ref) => (
  <tr ref={ref} className={`h-11 transition-colors hover:bg-surface-hover/70 ${className}`} {...props}>
    {children}
  </tr>
));
TableRow.displayName = "TableRow";

export const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className = "", children, ...props }, ref) => (
  <th ref={ref} className={`h-9 px-3.5 text-xs font-semibold uppercase tracking-wider text-text-subtle select-none whitespace-nowrap ${className}`} {...props}>
    {children}
  </th>
));
TableHead.displayName = "TableHead";

export const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className = "", children, ...props }, ref) => (
  <td ref={ref} className={`px-3.5 py-2.5 text-sm text-text whitespace-nowrap ${className}`} {...props}>
    {children}
  </td>
));
TableCell.displayName = "TableCell";
