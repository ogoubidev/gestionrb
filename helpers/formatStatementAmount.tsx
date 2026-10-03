const formatter=new Intl.NumberFormat("en-US",{
  useGrouping:true,
  minimumFractionDigits:0,
  maximumFractionDigits:0,
});

// Display only: keep the original precision for all calculations.
export const formatStatementAmount=(value:number)=>formatter.format(value);