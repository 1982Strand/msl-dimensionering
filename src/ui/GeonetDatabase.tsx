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
import { PageHeader } from './page';
import './GeonetDatabase.css';

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
    <main className="min-w-0 geonet-page">
      <PageHeader
        page="geonet-database"
        title={geonetDatabaseTitle}
        intro={geonetDatabaseSubtitle}
      />
      <section
        aria-labelledby="geonet-products-heading"
        className="section-card settings-card geonet-products"
      >
        <h2 id="geonet-products-heading">Produkter</h2>
        <p className="section-meta">{geonetDatabaseCaption}</p>
        <div className="setting-field geonet-search">
          <label htmlFor="geonet-search">Søg i geonetprodukter</label>
          <Input
            id="geonet-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Produkt, serie eller egenskab"
          />
        </div>
        <p aria-live="polite" className="section-meta geonet-count">
          {data.length} af {rows.length} produkter
        </p>
        <TooltipProvider>
          <Table
            aria-label="Geonetprodukter"
            style={{ tableLayout: 'auto', borderCollapse: 'separate' }}
            className="geonet-table table-auto border-separate border-spacing-0 [&_th]:w-auto [&_th]:border-b [&_td]:border-b"
          >
            <TableHeader>
              {table.getHeaderGroups().map((group) => (
                <TableRow key={group.id}>
                  {group.headers.map((header, index) => (
                    <TableHead
                      key={header.id}
                      scope="col"
                      style={{ width: 'auto' }}
                      className={index === 0 ? 'sticky left-0 z-20' : undefined}
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
                            className="geonet-sort h-auto py-2 text-left"
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
                          ? 'sticky left-0 z-10 font-medium'
                          : index === 24
                            ? 'geonet-note-cell whitespace-normal'
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
      <section aria-labelledby="geonet-notes-heading" className="geonet-notes">
        <div className="geonet-notes-heading">
          <h2 id="geonet-notes-heading">{geonetDatabaseNotesTitle}</h2>
          <p className="section-meta">{geonetDatabaseNotes.length} noter</p>
        </div>
        {geonetDatabaseNotes.map((note, index) => (
          <article
            key={note.titel}
            aria-labelledby={`geonet-note-${index}`}
            className="section-card settings-card geonet-note"
          >
            <p className="eyebrow">Note {index + 1}</p>
            <h3 id={`geonet-note-${index}`}>{note.titel}</h3>
            <div className="geonet-note-text">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.tekst}</ReactMarkdown>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
