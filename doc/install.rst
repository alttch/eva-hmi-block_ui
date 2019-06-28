Installation
************

Go to EVA ICS UI folder (usually */opt/eva/ui*) create *apps* folder if
it doesn't exist yet and clone app repository to it.

.. code-block:: bash

    cd /opt/eva/ui
    mkdir -p apps
    cd apps
    git clone https://github.com/alttch/eva-hmi-block_ui.git

If you don't have `EVA JS Framework
<https://github.com/alttch/eva-js-framework/>`_ installed, download it and
put e.g. to *lib* folder:

.. code-block:: bash

    cd /opt/eva/ui
    mkdir -p lib
    curl https://raw.githubusercontent.com/alttch/eva-js-framework/master/dist/eva.min.js -o lib/eva.min.js

Then create your first page in */opt/eva/ui/*, call it *index.j2*. J2 files
are regular HTML files however EVA ICS processes them as `Jinja2
templates <http://jinja.pocoo.org/>`_. If you don't plan to use Jinja tags,
you can name your file *index.html* as well:

.. code-block:: html

    <html>
      <head>
        <title>Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1,
            user-scalable=no" />
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <script type="text/javascript"
            src=".evahi/config.yml?as=js&var=evaHI"></script>
        <script type="text/javascript"
            src="config/index.yml?as=js&var=eva_hmi_config"></script>
        <script type="text/javascript"
            src="lib/eva.min.js"></script>
        <script type="text/javascript"
            src="apps/eva-hmi-block_ui/index.min.js"></script>
        <link rel="stylesheet"
            href="apps/eva-hmi-block_ui/themes/default/style.css">
        <link rel="stylesheet"
            href="apps/eva-hmi-block_ui/themes/default/icons.css">
        <script type="text/javascript">
          document.addEventListener('DOMContentLoaded', function() {
            $eva.hmi.start();
          });
        </script>
      </head>
    </html>

Let's explain it line-by-line:

This line adds top-bar and menu :doc:`navigation <navigation>`
configuration, which is `evaHI <https://github.com/alttch/evaHI>`_
compatible YAML or JSON file. As EVA ICS SFA allows to transform YAML files
on the flow to JSON or JavaScript variable/function, we'll use YAML almost
everywhere.

.. code-block:: html

    <script type="text/javascript"
        src=".evahi/config.yml?as=js&var=evaHI"></script>

Next we need to connect main page configuration. It should be placed to
JavaScript variable called *eva_hmi_config*.

.. code-block:: html

    <script type="text/javascript"
        src="config/index.yml?as=js&var=eva_hmi_config"></script>

By the way, you can split your configuration in several files, e.g. create
separate configuration files for buttons and cameras and load them to
proper JavaScript configuration variables for all pages you have.

Just note: if you've already loaded configuration for e.g. buttons, but buttons
with the same IDs are present in the main configuration, first configuration
will be overriden.

Valid configuration variables are:

* **eva_hmi_config**
* **eva_hmi_config_class**
* **eva_hmi_config_buttons**
* **eva_hmi_config_data**
* **eva_hmi_config_control_blocks**
* **eva_hmi_config_data_blocks**
* **eva_hmi_config_cameras**
* **eva_hmi_config_charts**
* **eva_hmi_config_layout**
* **eva_hmi_config_layout_compact**
* **eva_hmi_config_url**
* **eva_hmi_config_main_page**
* **eva_hmi_config_motd**
* **eva_hmi_config_chart_options**

Their names match proper sections in the configuration files.

Depending on a page class, create configuration file for :doc:`dashboard
<dashboard>`, :doc:`simple <simple>` or :doc:`sensors <sensors>` UI page.

.. note::

    Primary UI page (*index.html* or *index.j2*) should have either
    *dashboard* or *simple* class, as *sensors* page class doesn't have
    login form and if user is not authorized, redirect to the page
    specified in *eva_hmi_config_main_page* variable or to */ui/* if
    variable is not set.

Connect EVA JS Framework:

.. code-block:: html

    <script type="text/javascript" src="lib/eva.min.js"></script>

Connect HMI application:

.. code-block:: html

    <script type="text/javascript"
        src="apps/eva-hmi-block_ui/index.min.js"></script>

After loading, HMI application is automatically injected into EVA JS
Framework as *$eva.hmi*.

Finally, connect styles

.. code-block:: html

    <link rel="stylesheet"
            href="apps/eva-hmi-block_ui/themes/default/style.css">
    <link rel="stylesheet"
            href="apps/eva-hmi-block_ui/themes/default/icons.css">

and start interface app:

.. code-block:: html

    <script type="text/javascript">
      document.addEventListener('DOMContentLoaded', function() {
        $eva.hmi.start();
      });
    </script>

Before start, some app methods can be :doc:`overriden <overriding>`.
