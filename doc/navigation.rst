Navigation
**********

For navigation, `evaHI <https://github.com/alttch/evaHI>`_ configuration is
being parsed. This allows to use the same navigation config as for smartphone
app, as for the usual web clients.

The navigation configuration (placed by default in
*/opt/eva/ui/.evahi/config.yml*) looks like:

.. code-block:: yaml

    serial: 15
    index: /ui/
    index_landscape: /ui/
    menu:
        - {icon: 'room.png', name: 'Room 1', url: /ui/room1.j2}
        - {icon: 'room.png', name: 'Room 2', url: /ui/room2.j2}
        - {icon: 'room.png', name: 'Hall', url: /ui/hall.j2}
        - {icon: 'sensors.png', name: 'Sensors', url: /ui/sensors.j2}

where **serial** and **index_landscape**  parameters are used by smartphone app
only and ignored by HMI application.

Parameter **index** is used to specify the main UI page. Menu is built from
**menu** section entries, menu icons are located in */opt/eva/ui/.evahi/icons*
folder.
