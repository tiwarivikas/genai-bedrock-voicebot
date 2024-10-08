async function tool(params) {
  const { locationId, date } = params;
  const today = new Date();
  const tenDaysLater = new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000);

  function getRandomDate(start, end) {
    return new Date(
      start.getTime() + Math.random() * (end.getTime() - start.getTime())
    );
  }

  function getRandomTime() {
    const hour = Math.floor(Math.random() * (17 - 9 + 1)) + 9;
    const minute = Math.random() < 0.5 ? 0 : 30;
    return `${hour.toString().padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
  }

  function formatDate(date) {
    return date.toISOString().split("T")[0];
  }

  const numberOfSlots = Math.floor(Math.random() * 5) + 1;
  const slots = [];

  for (let i = 0; i < numberOfSlots; i++) {
    const randomDate = getRandomDate(today, tenDaysLater);
    slots.push({
      date: formatDate(randomDate),
      time: getRandomTime(),
    });
  }

  const results = {
    status: "success",
    data: slots,
  };
  /* const results = {
    status: "success",
    data: [
      {
        date: "2024-10-07",
        time: "09:00 AM",
      },
      {
        date: "2024-10-07",
        time: "11:30 AM",
      },
      {
        date: "2024-10-08",
        time: "02:00 PM",
      },
      {
        date: "2024-10-09",
        time: "10:15 AM",
      },
      {
        date: "2024-10-09",
        time: "03:45 PM",
      },
    ],
  }; */

  if (results.status !== "success") {
    return "No appointments found";
  }

  const appointments = results.data?.map((item) => {
    return "\n Date: " + item.date + "\n Time: " + item.time;
  });
  return "Appointment slots available: \n" + appointments?.join("\n");
}

module.exports = { tool };
