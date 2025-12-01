// Load dataset
d3.csv("./df_subset.csv", d => {
  const year = +String(d["Start.Year"]).trim();

  return {
    disasterType: d["Disaster.Type"],
    year: Number.isNaN(year) ? null : year
  };
}).then(rawData => {
  console.log("Loaded rows:", rawData);
  console.log("Sample row:", rawData);

  const data = rawData
    .filter(d => d.disasterType && d.year !== null)
    // We need to make sure that the data are sorted correctly by country and then by year
    .sort((a, b) => d3.ascending(a.disasterType, b.disasterType) || d3.ascending(a.year, b.year));

  const aggregated = d3.flatRollup(
    data,
    v => v.length,
    d => d.disasterType,
    d => d.year
  ).map(([disasterType, year, value]) => ({ disasterType, year, value }));

  const disasterTypes = Array.from(new Set(aggregated.map(d => d.disasterType))).sort(d3.ascending);
  const colors = d3.scaleOrdinal()
    .domain(disasterTypes)
    .range(d3.quantize(d3.interpolateRainbow, Math.max(disasterTypes.length, 1)));

  // Plot the bar chart
  createBarChart(aggregated, colors);
});

const createBarChart = (data, colors) => {
  // Set dimensions and margins of the plot
  const width = 1500, height = 950;
  const margins = {top: 10, right: 10, bottom: 350, left: 60};
  
  //  SVG element for bar chart
  const svg = d3.select("#bar")
    .append("svg")
    .attr("viewBox", [0, 0, width, height]);

  const slider = d3.select("#yearSlider");
  const sortSelect = d3.select("#sort");

  let currentYear = +slider.node().value;
  let currentSort = sortSelect.node().value;
  let newData = getSortedData(currentYear, currentSort);

  // Define x-axis, y-axis, and color scales
  const xScale = d3.scaleBand()
    .domain(newData.map(d => d.disasterType))
    .range([margins.left, width - margins.right])
    .padding(0.2);

  const yScale = d3.scaleLinear()
    .domain([0, Math.max(d3.max(newData, d => d.value) || 0, 1)])
    .range([height - margins.bottom, margins.top]);

  let bars = svg.append("g")
    .selectAll("rect")
    .data(newData, d => d.disasterType)
    .join("rect")
      .attr("x", d => xScale(d.disasterType))
      .attr("y", d => yScale(d.value))
      .attr("height", d => yScale(0) - yScale(d.value))
      .attr("width", xScale.bandwidth())
      .attr("fill", d => colors(d.disasterType));

  bars.append("title")
    .text(d => `${d.disasterType}: ${d.value} disasters`);
  
  const yAxis = d3.axisLeft(yScale);
  const yGroup = svg.append("g")
      .attr("transform", `translate(${margins.left},0)`)
    .call(yAxis)
    .call(g => g.select(".domain").remove());

  yGroup.selectAll("text")
    .style("font-size", "18px");

  const xAxis = d3.axisBottom(xScale);
  const xGroup = svg.append("g")
      .attr("transform", `translate(0,${height - margins.bottom})`)
    .call(xAxis);

  xGroup.selectAll("text")
    .style("text-anchor", "end")
    .style("font-size", "18px") 
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .attr("transform", "rotate(-65)");

  slider.on("change", function() {
    currentYear = +this.value;
    update();
  });

  sortSelect.on("change", function() {
    currentSort = this.value;
    update();
  });

  function getDataForYear(year) {
    return data
      .filter(d => d.year === year)
      .map(d => ({ disasterType: d.disasterType, value: d.value }));
  }

  function getSortedData(year, sortMethod) {
    const dataset = getDataForYear(year);

    if (sortMethod === 'cntAsce') {
      return dataset.sort((a, b) => d3.ascending(a.value, b.value));
    }
    if (sortMethod === 'cntDesc') {
      return dataset.sort((a, b) => d3.descending(a.value, b.value));
    }
    return dataset;
  }

  function update() {
    newData = getSortedData(currentYear, currentSort);

    const xScale = d3.scaleBand()
      .domain(newData.map(d => d.disasterType))
      .range([margins.left, width - margins.right])
      .padding(0.2);

    const yMax = d3.max(newData, d => d.value) || 0;
    const yScale = d3.scaleLinear()
      .domain([0, yMax === 0 ? 1 : yMax])
      .range([height - margins.bottom, margins.top]);

    const t = d3.transition()
      .duration(1000)
      .ease(d3.easeLinear);

    bars = bars.data(newData, d => d.disasterType)
      .join(
        enter => enter.append("rect")
          .attr("x", d => xScale(d.disasterType))
          .attr("y", yScale(0))
          .attr("height", 0)
          .attr("width", xScale.bandwidth())
          .attr("fill", d => colors(d.disasterType))
          .call(enter => enter.append("title"))
          .call(enter => enter.transition(t)
              .attr("height", d => yScale(0) - yScale(d.value))
              .attr("y", d => yScale(d.value))),
        update => update
          .transition(t)
          .attr("x", d => xScale(d.disasterType))
          .attr("y", d => yScale(d.value))
          .attr("height", d => yScale(0) - yScale(d.value))
          .attr("width", xScale.bandwidth()),
        exit => exit.transition(t)
          .attr("y", yScale(0))
          .attr("height", 0)
          .remove()
      );

    bars.select("title")
      .text(d => `${d.disasterType}: ${d.value} disasters`);

    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    xGroup.transition(t)
      .call(xAxis)
      .call(g => g.selectAll(".tick"));

    xGroup.selectAll("text")
      .style("text-anchor", "end")
      .style("font-size", "15px")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-65)");
  
    yGroup.transition(t)
        .call(yAxis)
        .selection()
        .call(g => g.select(".domain").remove());

    yGroup.selectAll("text")
       .style("font-size", "15px");
  }
};
