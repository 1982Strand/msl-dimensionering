import { useMemo, useState } from 'react';
import type { SortingState } from '@tanstack/react-table';
import {
  useLegacyTable,
  getCoreRowModel,
  getSortedRowModel,
  type LegacyColumnDef,
} from '@tanstack/react-table/legacy';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  geonetDatabaseRows,
  geonetDatabaseColumns,
  geonetDatabaseNotes,
  geonetDatabaseTitle,
  geonetDatabaseSubtitle,
  geonetDatabaseCaption,
  geonetDatabaseNotesTitle,
  type GeonetDatabaseRow,
} from '../engine/geonet-database';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '../components/ui/tooltip';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../components/ui/table';

const rows = geonetDatabaseRows();
const columns: LegacyColumnDef<GeonetDatabaseRow>[] = geonetDatabaseColumns.map(
  (column, index) => ({
    id: String(index),
    header: column.label,
    accessorFn: (row) => row[index],
    sortDescFirst: false,
  }),
);

export function GeonetDatabase() {
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const data = useMemo(() => {
    const query = search.toLocaleLowerCase('da-DK');
    return rows.filter((row) =>
      row.some((cell) => String(cell).toLocaleLowerCase('da-DK').includes(query)),
    );
  }, [search]);
  const table = useLegacyTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  return (
    <main className="min-w-0 space-y-6">
      <div>
        <h1>{geonetDatabaseTitle}</h1>
        <p className="intro">{geonetDatabaseSubtitle}</p>
      </div>
      <section
        aria-labelledby="geonet-products-heading"
        className="min-w-0 rounded-lg border bg-white p-5 sm:p-6"
      >
        <h2 id="geonet-products-heading" className="text-xl font-semibold">
          Produkter
        </h2>
        <p className="mb-5 mt-2 text-sm text-muted-foreground">{geonetDatabaseCaption}</p>
        <label htmlFor="geonet-search" className="mb-2 block text-sm">
          Søg i geonetprodukter
        </label>
        <Input
          id="geonet-search"
          className="mb-3 max-w-sm"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Produkt, serie eller egenskab"
        />
        <p aria-live="polite" className="mb-3 text-sm text-muted-foreground">
          {data.length} af {rows.length} produkter
        </p>
        <TooltipProvider>
          <Table
            aria-label="Geonetprodukter"
            style={{ tableLayout: 'auto', borderCollapse: 'separate' }}
            className="table-auto border-separate border-spacing-0 [&_th]:w-auto [&_th]:border-b [&_td]:border-b"
          >
            <TableHeader>
              {table.getHeaderGroups().map((group) => (
                <TableRow key={group.id}>
                  {group.headers.map((header, index) => (
                    <TableHead
                      key={header.id}
                      scope="col"
                      style={{ width: 'auto', background: 'white' }}
                      className={index === 0 ? 'sticky left-0 z-20 bg-white' : 'bg-white'}
                      aria-sort={
                        header.column.getIsSorted() === 'asc'
                          ? 'ascending'
                          : header.column.getIsSorted() === 'desc'
                            ? 'descending'
                            : 'none'
                      }
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto py-3 text-left"
                            aria-label={`Sortér efter ${geonetDatabaseColumns[index].label.replaceAll('\n', ' ')}`}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            <span className="whitespace-pre">
                              {geonetDatabaseColumns[index].label}
                            </span>
                            <span aria-hidden="true">
                              {header.column.getIsSorted() === 'asc'
                                ? '↑'
                                : header.column.getIsSorted() === 'desc'
                                  ? '↓'
                                  : '↕'}
                            </span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-80">
                          {geonetDatabaseColumns[index].help}
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell, index) => (
                    <TableCell
                      key={cell.id}
                      className={
                        index === 0
                          ? 'sticky left-0 z-10 bg-white font-medium'
                          : index === 24
                            ? 'min-w-96 max-w-[36rem] whitespace-normal'
                            : ''
                      }
                    >
                      {String(cell.getValue())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.length}>Ingen produkter matcher søgningen.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TooltipProvider>
      </section>
      <section aria-labelledby="geonet-notes-heading" className="space-y-4 border-t pt-6">
        <div>
          <h2 id="geonet-notes-heading" className="text-xl font-semibold">
            {geonetDatabaseNotesTitle}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{geonetDatabaseNotes.length} noter</p>
        </div>
        {geonetDatabaseNotes.map((note, index) => (
          <article
            key={note.titel}
            aria-labelledby={`geonet-note-${index}`}
            className="rounded-lg border bg-white p-5 sm:p-6"
          >
            <p className="mb-2 text-sm font-semibold text-primary">Note {index + 1}</p>
            <h3 id={`geonet-note-${index}`} className="mb-3 font-semibold">
              {note.titel}
            </h3>
            <div className="text-sm leading-7 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:underline">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.tekst}</ReactMarkdown>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
