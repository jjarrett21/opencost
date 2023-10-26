import * as React from "react";
import { Modal, Typography } from "@material-ui/core";
import Warnings from "../components/Warnings";
import CircularProgress from "@material-ui/core/CircularProgress";

import {
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import { toCurrency } from "../util";
import cloudCostDayTotals from "../services/cloudCostDayTotals";

const CloudCostDetails = ({
  onClose,
  selectedProviderId,
  selectedItem,
  agg,
  filters,
  costMetric,
  window,
  currency,
}) => {
  const [data, setData] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [errors, setErrors] = React.useState([]);
  const [fetch, setFetch] = React.useState(true);

  async function fetchData() {
    setLoading(true);
    setErrors([]);

    try {
      const resp = await cloudCostDayTotals.fetchCloudCostData(
        window,
        agg,
        costMetric,
        [
          ...(filters ?? []),

          { property: "providerIds", value: selectedProviderId },
        ]
      );
      if (resp.data) {
        setData(resp.data);
      } else {
        if (resp.message && resp.message.indexOf("boundary error") >= 0) {
          let match = resp.message.match(/(ETL is \d+\.\d+% complete)/);
          let secondary = "Try again after ETL build is complete";
          if (match.length > 0) {
            secondary = `${match[1]}. ${secondary}`;
          }
          setErrors([
            {
              primary: "Data unavailable while ETL is building",
              secondary: secondary,
            },
          ]);
        }
        setData([]);
      }
    } catch (error) {
      if (err.message.indexOf("404") === 0) {
        setErrors([
          {
            primary: "Failed to load report data",
            secondary:
              "Please update Kubecost to the latest version, then contact support if problems persist.",
          },
        ]);
      } else {
        let secondary =
          "Please contact Kubecost support with a bug report if problems persist.";
        if (err.message.length > 0) {
          secondary = err.message;
        }
        setErrors([
          {
            primary: "Failed to load report data",
            secondary: secondary,
          },
        ]);
      }
      setData([]);
    }
    setLoading(false);
    setFetch(false);
  }

  useEffect(() => {
    if (fetch) {
      fetchData();
    }
  }, [fetch]);

  const drilldownData = (data ?? []).sort(
    (a, b) =>
      new Date(a.date ?? "").getTime() - new Date(b.date ?? "").getTime()
  );

  const itemData = drilldownData.map((items) => {
    const dataPoint = {
      time: new Date(items.date),
      cost: items.cost,
    };
    return dataPoint;
  });

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`Costs over the last ${window}`}
    >
      <Typography style={{ marginTop: "1rem" }} variant="p">
        {selectedItem}
      </Typography>

      {loading && (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{ paddingTop: 100, paddingBottom: 100 }}>
            <CircularProgress />
          </div>
        </div>
      )}
      {!loading && errors.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <Warnings warnings={errors} />
        </div>
      )}
      {data && (
        <div style={{ display: "flex", marginTop: "2.5rem" }}>
          <ResponsiveContainer
            height={250}
            id={"cloud-cost-drilldown"}
            width={"100%"}
          >
            <BarChart
              data={itemData}
              margin={{
                top: 0,
                bottom: 10,
                left: 20,
                right: 0,
              }}
            >
              <CartesianGrid vertical={false} />
              <Legend verticalAlign={"bottom"} />
              <XAxis
                dataKey={"time"}
                tickFormatter={(date) => format(date, "MM/dd/yyy")}
              />
              <YAxis tickFormatter={(tick) => `${toCurrency(tick)}`} />
              <Bar dataKey={"cost"} fill={"#2196f3"} name={"Item Cost"} />
              <Tooltip
                formatter={(value) =>
                  `${toCurrency(value ?? 0, currency, 4, true)}`
                }
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Modal>
  );
};

export { CloudCostDetails };
