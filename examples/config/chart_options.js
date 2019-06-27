var eva_hmi_config_chart_options = {
  legend: {
    display: false,
  },
  scales: {
    yAxes: [{
      ticks: {
        fontSize: 14,
        fontColor: '#999',
        userCallback: function(value, index, values) {
          if(index == 0 || index == values.length-1) return value;
        },
      },
      gridLines: {
        display: false,
        lineWidth: 2,
        tickMarkLength: 5,
        color: "#999",
      },
    }],
    xAxes: [{
      type: 'time',
      time: {
        unit: 'hour',
        unitStepSize: 1,
        round: 'minute',
        tooltipFormat: 'H:mm:ss',
        displayFormats: {
          hour: 'H:mm',
        },
      },
      ticks: {
        fontSize: 14,
        fontColor: '#ccc',
        maxTicksLimit: 12,
        maxRotation: 0,
        autoSkip: true,
      },
      gridLines: {
        display: true,
        lineWidth: 2,
        color: "#999",
        drawOnChartArea: false,
        tickMarkLength: 10,
        borderDash: [5, 10],
      },
    }],
  },
  plugins: {
    filler: {
      propagate: true
    }
  },
  elements: {
    line: {
      //tension: 0, // disables bezier curves
      borderWidth: 2,
    }
  },
  tooltips: {
    mode: 'index',
    intersect: false,
  },
  animation: {
    duration: 1000, // general animation time
  },
};
