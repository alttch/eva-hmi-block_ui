Sensors page
************

Sensor page class is used to display a charts.

.. figure:: images/sensors.jpg
    :scale: 50%
    :alt: sensors page

Configuration looks like

.. literalinclude:: ../examples/config/sensors.yml
    :language: yaml

The page doesn't have compact layout.

Global variables
================

main-page
---------

As sensor class doesn't have login window, main page uri may be specified. This
variable may be used if :doc:`navigation<navigation>` is not set up.

charts
======

In section *charts*, chart configurations are specified. Single chart
configuration looks like:

.. code-block:: yaml

  room1_temp:
    icon: indoor_temp
    item: sensor:env/temp1_int
    title: Room 1 temperature
    cfg: default
    units: "°C"
    color: orange
    fill: "false"
    background-color: orange
    decimals: 0
    params:
      timeframe: 1D
      fill: 30T:1
      prop: value

* **icon** chart item :ref:`icon<data_icons>` (CSS class
  *.eva_hmi_data_item.i_<icon_name>*)

* **item** EVA ICS item to display a chart for, usually a sensor, but can be
  unit or logical variable as well
* **title** chart title
* **cfg** if specified and is not *default*,
  :ref:`$eva.hmi.format_chart_config<format_chart_config>` is called.
* **units** value units. As YAML doesn't like special characters, should be
  quoted
* **color** chart line color
* **fill** if true, chart will be filled
* **background-color** chart background color (to fill)
* **decimals** value decimals after comma
* **params** chart params for `$eva.toolbox.chart
  <https://www.npmjs.com/package/@eva-ics/toolbox>`_ function.

layout
======

Layout section looks like

.. code-block:: yaml

    layout:
      charts:
        - { id: room1_temp, reload: 180 }
        - { id: room1_hum, reload: 180 }
        - { id: room2_temp, reload: 180 }
        - { id: room2_hum, reload: 180 }
        - { id: outdoor_temp, reload: 180 }
        - { id: outdoor_hum, reload: 180 }
        - { id: air_pressure, reload: 180 }
      #sys-block: true

Charts are listed in *charts* subsection, *reload* parameter specifies chart
reload interval in seconds (default: 60 seconds).

If *sys-block* parameter is specified and is *true*, system block (system info,
evaHI setup, logout link) will be displayed at the bottom of the page.

Chart options
=============

For this page class, **eva_hmi_config_chart_options** must be defined which
contains an options for `Chart.js <https://www.chartjs.org/>`_.

Usually, chart options are just a piece of JavaScript code, included in app as:

.. code-block:: html

    <script type="text/javascript" src="config/chart_options.js"></script>

and look like:

.. literalinclude:: ../examples/config/chart_options.js
    :language: javascript
