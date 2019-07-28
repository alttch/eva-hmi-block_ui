Overriding and embedding
************************

The following app methods can be overriden:

.. contents::

$eva.hmi.after_draw
===================

The method is empty by default and called every time when layout drawing is
completed. Function parameter is *true* if current layout is compact.

.. code-block:: javascript

    $eva.hmi.after_draw = function(compact) {
      // perform some final DOM modifications
    }

$eva.hmi.error
==============

The method is called only when internal error is occurred during HMI
initialization. Usually should not be overriden, default is

.. code-block:: javascript

    $eva.hmi.error = function(msg) { throw new error(msg); }

$eva.hmi.format_camera_src
==========================

The method is called with param *cam_id* and returns camera image source.
Overriding can be used, e.g. to skip loading camera images on wall-mount
kiosk tablet when nobody is in the building.

.. code-block:: javascript

    $eva.hmi.format_camera_src = function(cam_id) {
      if ($eva.authorized_user == 'kiosk' &&
        !$eva.state('flags/people_present').value) {
          return '/ui/images/black.png';
        }
    }

If function doesn't return a value or return null, default camera image is
used.

.. _format_chart_config:

$eva.hmi.format_chart_config
============================

The method is called to prepare :doc:`chart config<sensors>`.

E.g. we have a charts with *cfg: realtime* which display real-time data from
sensors. But our default chart options are set up for hourly charts.

Let's tune it:

.. code-block:: javascript

   $eva.hmi.format_chart_config = function(cfg_id, cfg) {
      if (cfg_id == 'realtime') {
        cfg.options.scales.xAxes[0].time.unit = 'minute';
        cfg.options.scales.xAxes[0].time.round = 'second';
        cfg.options.scales.xAxes[0].ticks.maxTicksLimit = 4;
      }
    }

$eva.hmi.prepare_layout
=======================

The method is called before layout drawing.

.. code-block:: javascript

    $eva.hmi.prepare_layout = function() {};

$eva.hmi.top_bar
================

The method is called to initialize and draw top bar.

By default it looks like:

.. code-block:: javascript

    $eva.hmi.top_bar = function() {
      if (!$eva.in_evaHI) $eva.hmi.draw_top_bar();
    }

In example, if top bar is not required for kiosk tablet, you can completely
disable it, e.g. using *$eva.hmi.prepare_layout*:

.. code-block:: javascript

    $eva.hmi.prepare_layout = function() {
      if ($eva.authorized_user == 'kiosk') {
        $eva.hmi.top_bar = function(){};
      }
    }

Overriding logo
===============

Variables *$eva.hmi.logo.href* and *$eva.hmi.logo.text* can be overriden to
set custom logo text and URI when main menu is opened.

To override logo image, change background image of CSS class *.eva_hmi_logo*.

Embedding (experimental)
========================

.. figure:: images/grafana-hmi.jpg
    :scale: 30%
    :alt: Grafana dashboard

    `Grafana <https://grafana.com/>`_ dashboard with EVA HMI Block UI controls

Block UI pages can be embedded into 3rd party interface via iframe.

To embed, add two parameters to page URI:

* **embedded** *1* or *friendly* (see below)
* **k** EVA SFA API key (not required if you use basic authentication or log
  into to HMI Block UI separately)

If both HMI Block UI and 3rd party UI run on the same domain (e.g. via common
front-end), you may set *embedded=friendly*. This will allow HMI Block UI to
communicate with parent window, e.g. close popover windows on body click.

