#!/usr/bin/env python3

css = open('../themes/default/icons.css').readlines()
i = 0
data_icons = {}
di_maxlength = 0
state_icons = {}
si_maxlength = 0
sc_maxlength = 0
special_state_icons = {}
while i < len(css):
    s = css[i]
    if s.startswith('.eva_hmi_data_item'):
        c = s.split('.')[2].split(' ')[0]
        i += 1
        img = css[i].split('\'')[1]
        data_icons[c[2:]] = img
        l = len(c) - 2
        if l > di_maxlength: di_maxlength = l
    elif s.startswith('.eva_hmi_cbtn.'):
        subclasses = s.split(',')
        i += 1
        img = css[i].split('\'')[1]
        for s in subclasses:
            x = s.split('.')
            c = x[2]
            sc = x[3].split()[0]
            try:
                int(sc[2:])
                state_icons.setdefault(c[2:], {})[sc] = img
                if len(sc) > sc_maxlength:
                    sc_maxlength = l
                l = len(c + sc) - 1
                if l > si_maxlength:
                    si_maxlength = l
            except:
                special_state_icons.setdefault(c[2:], {})[sc] = img
    i += 1
print("""Icons (default theme)
*********************

.. contents::

.. _data_icons:

Data icons
==========

""")
for i in sorted(data_icons):
    print('.. |di_{}| image:: ../themes/default/{}'.format(i, data_icons[i]))
    print('  :width: 42px')
    print('  :align: middle')
    print()
print('+' + '-' * (di_maxlength + 2) + '+' + '-' * (di_maxlength + 7) + '+')
print('| ' + 'name'.ljust(di_maxlength) + ' | ' +
      'icon'.ljust(di_maxlength + 6) + '|')
print('+' + '=' * (di_maxlength + 2) + '+' + '=' * (di_maxlength + 7) + '+')
for i in sorted(data_icons):
    print('| ' + i.ljust(di_maxlength) + ' | |di_' + i + '|' +
          ' ' * (di_maxlength - len(i)) + ' |')
    print('+' + '-' * (di_maxlength + 2) + '+' + '-' * (di_maxlength + 7) + '+')

print("""
.. _state_icons:

State icons
===========

""")

for i in sorted(state_icons):
    for z in sorted(state_icons[i]):
        print('.. |si_{}.{}| image:: ../themes/default/{}'.format(
            i, z, state_icons[i][z]))
        print('  :width: 42px')
        print('  :align: middle')
        print()

si_maxlength += 6

max_t = ''
for i, v in state_icons.items():
    t = ''
    for a in v:
        t += '| {} '.format(a.ljust(si_maxlength))
    if len(t) > len(max_t):
        max_t = t

line = '+' + '-' * (si_maxlength + 2)
for x in max_t.split('|'):
    line += '-' * len(x) + '+'
print(line)
print('| ' + 'name'.ljust(si_maxlength) + ' ' + max_t + '|')
print(line.replace('-', '='))
for i in sorted(state_icons):
    print('| ' + i.ljust(si_maxlength) + ' | ', end='')
    z = 0
    for x in sorted(state_icons[i]):
        z += 1
        print(
            '|si_' + i + '.' + x + '|' + ' ' * (si_maxlength - len(i + x) - 6) +
            ' | ',
            end='')
    while z < len(max_t.split('|')) - 1:
        z += 1
        print(' ' * (si_maxlength) + ' | ', end='')
    print()
    print(line)

print("""
.. _special_state_icons:

Special state icons
===================
""")
for spicon in sorted(special_state_icons):
    print(spicon)
    print('-' * len(spicon))
    print()
    spi = special_state_icons[spicon]
    spi_maxlength = 0
    for i in spi:
        if len(i + spicon) > spi_maxlength: spi_maxlength = len(i + spicon)
    spi_maxlength += 2
    for s in sorted(spi):
        print('.. |spi_{}.{}| image:: ../themes/default/{}'.format(
            spicon, s, spi[s]))
        print('  :width: 42px')
        print('  :align: middle')
        print()
    print('+' + '-' * (spi_maxlength + 2) + '+' + '-' * (spi_maxlength + 7) +
          '+')
    print('| ' + 'state'.ljust(spi_maxlength) + ' | ' +
          'icon'.ljust(spi_maxlength + 6) + '|')
    print('+' + '=' * (spi_maxlength + 2) + '+' + '=' * (spi_maxlength + 7) +
          '+')
    for i in sorted(spi):
        print('| ' + i.ljust(spi_maxlength) + ' | |spi_' + spicon + '.' + i +
              '|' + ' ' * (spi_maxlength - len(i + spicon) - 2) + ' |')
        print('+' + '-' * (spi_maxlength + 2) + '+' +
              '-' * (spi_maxlength + 7) + '+')
    print()
