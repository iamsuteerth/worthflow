import { useSimulation }
  from "../hooks/useSimulation";

export default function ForecastTable() {
  const result =
    useSimulation();

  return (
    <div>
      <h2>
        Forecast
      </h2>

      <table>
        <thead>
          <tr>
            <th>Month</th>
            <th>Cash</th>
            <th>Net Worth</th>
          </tr>
        </thead>

        <tbody>
          {result.rows.map(
            (row) => (
              <tr
                key={
                  row.month
                }
              >
                <td>
                  {row.month}
                </td>

                <td>
                  {Math.round(
                    row.assets
                      .cash
                  )}
                </td>

                <td>
                  {Math.round(
                    row.assets
                      .netWorth
                  )}
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}