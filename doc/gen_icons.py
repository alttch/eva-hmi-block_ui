#!/usr/bin/env python3

css = open('../themes/default/icons.css').readlines()
i = 0
data_icons = {}
di_maxlength = 0
state_icons = {}
while i < len(css):
    s = css[i]
    if s.startswith('.eva_hmi_data_item'):
        c = s.split('.')[2].split(' ')[0]
        i += 1
        img = css[i].split('\'')[1]
        data_icons[c[2:]] = img
        l = len(c) - 2
        if l > di_maxlength: di_maxlength = l
    elif s.startswith('.eva_hmi_cbtn'):
        subclasses = s.split(',')
        i += 1
        img = css[i].split('\'')[1]
        for s in subclasses:
            x = s.split('.')
            c = x[2]
            sc = x[3].split()[0]
            state_icons.setdefault(c[2:], {})[sc] = img
    i += 1
print ("""Icons (default theme)
*********************

.. toctree::

.. _data_icons:

Data icons
----------

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
