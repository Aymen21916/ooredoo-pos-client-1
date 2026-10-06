import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight } from 'lucide-react';

/** Shown to cashiers while some of their customers were marked "not valid" and still need the correct info. */
export default function CorrectionBanner({ count }) {
  if (!count) return null;
  return (
    <div role="alert" className="mb-4 flex flex-col gap-3 rounded-xl border-s-4 border-amber-500 bg-amber-50 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={22} />
        <div className="text-sm text-amber-900">
          <div className="font-bold">
            {count} {count === 1 ? 'customer needs' : 'customers need'} correction
          </div>
          <div className="text-amber-800/80">
            The admin marked some of your customers’ information as not valid. Please send the correct information.
          </div>
        </div>
      </div>
      <Link
        to="/cashier/customers?correction=1"
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600"
      >
        Correct now <ArrowRight size={16} className="rtl:rotate-180" />
      </Link>
    </div>
  );
}