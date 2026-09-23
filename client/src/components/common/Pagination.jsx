import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "./Button";
export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1 && page <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <Button
        variant="secondary"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft size={16} />
        Previous
      </Button>
      <span>
        Page {page}
        {totalPages > 0 ? ` of ${totalPages}` : ""}
      </span>
      <Button
        variant="secondary"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Next
        <ChevronRight size={16} />
      </Button>
    </nav>
  );
}
