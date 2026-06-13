export function calculateXirr(
  cashflows: {
    amount: number;
    date: Date;
  }[]
): number | null {
  if (cashflows.length < 2) return null;

  const hasPositive = cashflows.some((cf) => cf.amount > 0);
  const hasNegative = cashflows.some((cf) => cf.amount < 0);
  if (!hasPositive || !hasNegative) return null;

  const sorted = [...cashflows].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  const baseDate = sorted[0].date.getTime();

  // Use 365.25 to match Excel XIRR convention
  const DAYS_PER_YEAR = 365.25;
  const MS_PER_YEAR = 1000 * 60 * 60 * 24 * DAYS_PER_YEAR;

  const years = sorted.map((cf) => (cf.date.getTime() - baseDate) / MS_PER_YEAR);
  const amounts = sorted.map((cf) => cf.amount);
  const n = amounts.length;

  // Net Present Value at a given rate
  function npv(rate: number): number {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const t = years[i];
      sum += t === 0 ? amounts[i] : amounts[i] / Math.pow(1 + rate, t);
    }
    return sum;
  }

  // Derivative of NPV with respect to rate
  function dnpv(rate: number): number {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const t = years[i];
      if (t === 0) continue;
      sum -= (t * amounts[i]) / Math.pow(1 + rate, t + 1);
    }
    return sum;
  }

  const RATE_TOL = 1e-10;
  const NPV_TOL = 1e-10;
  const MAX_ITER = 300;

  // --- Pass 1: Newton-Raphson with backtracking ---
  // Fast convergence when well-behaved; we try several starting guesses.
  const newtonGuesses = [0.1, 0.0, 0.5, -0.1, -0.3, 1.0, 2.0, -0.5];

  for (const initial of newtonGuesses) {
    let rate = initial;
    let prevNpv = npv(rate);

    for (let i = 0; i < MAX_ITER; i++) {
      const slope = dnpv(rate);

      if (!Number.isFinite(slope) || Math.abs(slope) < 1e-15) break;

      let step = prevNpv / slope;
      let next = rate - step;

      // Backtracking line search: halve step if NPV didn't decrease or went out of bounds
      let backtrack = 0;
      while (
        (next <= -0.9999 || !Number.isFinite(next)) &&
        backtrack < 50
      ) {
        step *= 0.5;
        next = rate - step;
        backtrack++;
      }
      if (next <= -0.9999 || !Number.isFinite(next)) break;

      const nextNpv = npv(next);

      if (
        Math.abs(next - rate) < RATE_TOL &&
        Math.abs(nextNpv) < NPV_TOL
      ) {
        return next * 100;
      }

      rate = next;
      prevNpv = nextNpv;
    }
  }

  // --- Pass 2: Brent's method (guaranteed convergence given a bracket) ---
  // Scan for a sign change across a wide range of rates.
  function findBracket(): [number, number] | null {
    // Sweep candidate rates from -99% to very high returns
    const candidates: number[] = [];

    // Fine-grained near zero (most common region)
    for (let r = -0.99; r <= 10; r += 0.01) {
      candidates.push(parseFloat(r.toFixed(4)));
    }
    // Coarser at higher rates
    for (let r = 10; r <= 100; r += 1) {
      candidates.push(r);
    }

    for (let i = 0; i < candidates.length - 1; i++) {
      const a = candidates[i];
      const b = candidates[i + 1];
      const fa = npv(a);
      const fb = npv(b);
      if (Number.isFinite(fa) && Number.isFinite(fb) && fa * fb < 0) {
        return [a, b];
      }
    }
    return null;
  }

  const bracket = findBracket();
  if (!bracket) return null;

  // Brent's method implementation
  function brent(a: number, b: number): number | null {
    let fa = npv(a);
    let fb = npv(b);

    if (fa * fb > 0) return null;

    // Ensure |f(b)| <= |f(a)| (b is the "better" side)
    if (Math.abs(fa) < Math.abs(fb)) {
      [a, b] = [b, a];
      [fa, fb] = [fb, fa];
    }

    let c = a;
    let fc = fa;
    let mflag = true;
    let d = 0; // 's' has been removed from here

    for (let i = 0; i < MAX_ITER; i++) {
      if (Math.abs(b - a) < RATE_TOL && Math.abs(fb) < NPV_TOL) break;
      if (Math.abs(fb) < NPV_TOL) break;

      let s: number; // Declare 's' cleanly inside the loop

      if (fa !== fc && fb !== fc) {
        // Inverse quadratic interpolation
        s =
          (a * fb * fc) / ((fa - fb) * (fa - fc)) +
          (b * fa * fc) / ((fb - fa) * (fb - fc)) +
          (c * fa * fb) / ((fc - fa) * (fc - fb));
      } else {
        // Secant method
        s = b - fb * ((b - a) / (fb - fa));
      }

      const cond1 = !((3 * a + b) / 4 < s && s < b) &&
        !(b < s && s < (3 * a + b) / 4);
      const cond2 = mflag && Math.abs(s - b) >= Math.abs(b - c) / 2;
      const cond3 = !mflag && Math.abs(s - b) >= Math.abs(c - d) / 2;
      const cond4 = mflag && Math.abs(b - c) < RATE_TOL;
      const cond5 = !mflag && Math.abs(c - d) < RATE_TOL;

      if (cond1 || cond2 || cond3 || cond4 || cond5) {
        // Bisection fallback
        s = (a + b) / 2;
        mflag = true;
      } else {
        mflag = false;
      }

      let fs = npv(s); // Switched to let
      if (!Number.isFinite(fs)) {
        s = (a + b) / 2;
        fs = npv(s); // Recalculate fs so it doesn't break the loop logic
      }

      d = c;
      c = b;
      fc = fb;

      if (fa * fs < 0) {
        b = s;
        fb = fs;
      } else {
        a = s;
        fa = fs;
      }

      if (Math.abs(fa) < Math.abs(fb)) {
        [a, b] = [b, a];
        [fa, fb] = [fb, fa];
      }
    }

    return Math.abs(fb) < 1e-6 ? b : null;
  }

  const result = brent(bracket[0], bracket[1]);
  if (result !== null && Number.isFinite(result)) {
    return result * 100;
  }

  return null;
}