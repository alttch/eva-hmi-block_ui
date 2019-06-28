Simple page
***********

.. figure:: images/simple.jpg
    :scale: 50%
    :alt: simple page

Simple page configuration looks like

.. literalinclude:: ../examples/config/simple.yml
    :language: yaml

The configuration is similar to :doc:`dashboard-class page<dashboard>` but
simplified. *camera* and *buttons* section is optional.

The page can have one camera, all control buttons are grouped into a single
block. There's no compact layout for *simple* page class.

If *sys-block* parameter is specified and is *true*, system block (system info,
evaHI setup, logout link) will be displayed at the bottom of the page.
