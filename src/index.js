`use strict`;

(() => {
  const $ = require('jquery');

  window.$ = $;

  require('bootstrap');
  require('bootstrap/dist/css/bootstrap.min.css');
  require('swiped-events');

  const VanillaToasts = require('vanillatoasts');
  require('vanillatoasts/vanillatoasts.css');

  require('@eva-ics/framework');
  require('@eva-ics/toolbox');

  const $eva = window.$eva;

  var login_window;
  var content_holder;
  var first_time_login = true;
  var btn_coord;
  var camera_reloader = Array();
  var chart_creators = Array();
  var current_layout_compact = false;
  var initialized = false;
  var slider_update_funcs = Array();
  var menu_active = false;
  var popover_cbtns = Array();
  var timers = Array();

  function error(msg) {
    throw new Error(msg);
  }

  function server_error(err, wait, title) {
    var t = wait !== undefined ? wait : 2000;
    var msg = err.message;
    if (!msg) msg = err;
    let toast = VanillaToasts.create({
      title: title ? title : 'Error',
      type: 'error',
      text: msg,
      timeout: t
    });
  }

  function server_is_gone(err) {
    stop_intervals();
    var ct = 10;
    var auto_reconnect = setTimeout(function() {
      $eva.start();
    }, (ct + 1) * 1000);
    $eva.toolbox
      .popup(
        'eva_hmi_popup',
        'error',
        'Server error',
        'Connection to server failed',
        {
          ct: ct,
          btn1: 'Retry'
        }
      )
      .then(function() {
        clearTimeout(auto_reconnect);
        $eva.start();
      })
      .catch(err => {});
  }

  function create_control_block(block_id) {
    if (
      !window.eva_hmi_config_control_blocks ||
      !(block_id in window.eva_hmi_config_control_blocks)
    ) {
      $eva.hmi.error('Control block ' + block_id + ' is not defined');
    }
    var cblk = $('<div />');
    cblk.addClass('eva_hmi_control_block');
    $.each(window.eva_hmi_config_control_blocks[block_id]['elements'], function(
      i,
      v
    ) {
      cblk.append(create_button(v));
    });
    return cblk;
  }

  function success(text, title) {
    if (window.eva_hmi_config_info_level != 'info') return;
    let toast = VanillaToasts.create({
      title: title ? title : 'Completed',
      type: 'success',
      text: text ? text : 'Command successful',
      timeout: 2000
    });
  }

  function create_api_action(
    api_method,
    action_item,
    params,
    el,
    config,
    is_btn
  ) {
    var on_error = function() {
      el.removeClass('busy');
    };
    if (action_item.startsWith('unit:')) {
      var before_start = function() {};
    } else {
      var before_start = function() {
        el.addClass('busy');
      };
    }
    var process_result = function() {};
    var after_start = function() {};
    if (!action_item.startsWith('unit:')) {
      after_start = function() {
        el.removeClass('busy');
        success();
      };
    }
    if (action_item.startsWith('lmacro:') || action_item.startsWith('unit:')) {
      process_result = function(result) {
        if (!result || !result.uuid) {
          server_error('Action failed');
        } else {
          $eva.watch_action(result.uuid, function(a) {
            if (a.finished) {
              if (
                a.exitcode ||
                (a.status != 'completed' && a.status != 'ignored')
              ) {
                server_error(
                  '<div align="left" width="100%">' +
                    a.uuid +
                    '<br />action: ' +
                    a.item_oid +
                    '<br />code: ' +
                    a.exitcode +
                    '; status: ' +
                    a.status +
                    '<br />' +
                    a.err +
                    '</div>',
                  null,
                  'Action failed'
                );
              } else {
                success('Action finished');
              }
            }
          });
        }
      };
    }
    if (
      (config.busy || (api_method == 'run' && config.busy !== false)) &&
      is_btn &&
      !action_item.startsWith('lvar:')
    ) {
      after_start = function(result) {
        if (!result || !result.uuid) {
          server_error(err);
          on_error();
        }
      };
      el.custom_busy = true;
      if (!config.busy || config.busy == 'uuid') {
        after_start = function(result) {
          if (!result || !result.uuid) {
            el.removeClass('busy');
          } else {
            $eva.watch_action(result.uuid, function(a) {
              if (a.finished) {
                el.removeClass('busy');
              }
            });
          }
        };
      } else if (config.busy.startsWith('lvar:')) {
        after_start = function(result) {
          let state = $eva.state(config.busy);
          if (!state.status || !state.value || state.value == '0') {
            el.removeClass('busy');
          }
          if (!result || !result.uuid) {
            server_error(err);
            on_error();
          }
        };
        set_el_busy_lvar(config.busy, el);
      } else {
        $eva.hmi.error('unknown busy class: ' + config.busy);
      }
    }
    return function() {
      if (el.hasClass('busy')) return;
      before_start();
      $eva
        .call(api_method, action_item, params)
        .then(function(result) {
          after_start(result);
          process_result(result);
        })
        .catch(function(err) {
          on_error(err);
          server_error(err);
        });
    };
  }

  function set_el_busy_lvar(lvar, el) {
    if (!lvar || !lvar.startsWith('lvar:')) return false;
    $eva.watch(lvar, function(state) {
      if (state.status && state.value && state.value != '0') {
        el.addClass('busy');
      } else {
        el.removeClass('busy');
      }
    });
    el.custom_busy = true;
  }

  function append_action(el, config, is_btn, item) {
    var action = config.action;
    var a = null;
    if (!action) {
      if (is_btn) {
        action = config.item;
        if (!action) return;
      } else {
        return;
      }
    }
    if (config.menu) {
      if (is_btn) el.addClass('menu');
      set_el_busy_lvar(config.busy, el);
      if (config.menu === true || typeof config.menu == 'number') {
        var ms;
        config.menu === true ? (ms = 2) : (ms = config.menu);
        var mc = $('<span />');
        for (var i = 0; i < ms; i++) {
          var b = $('<button >');
          b.addClass('eva_hmi_cbtn');
          b.addClass('i_' + config.icon);
          b.addClass('s_' + i);
          var params = $.extend({}, config.action_params);
          b.attr('eva-ui-status-to', i);
          b.on('click', function() {
            params['s'] = this.getAttribute('eva-ui-status-to');
            $eva
              .call('action', action, params)
              .then(function(result) {
                el.find('.error_msg').remove();
              })
              .catch(function(err) {
                if (is_btn) el.removeClass('busy');
                el.append($('<span />', {class: 'error_msg'}));
                server_error(err);
              });
          });
          b.appendTo(mc);
        }
      } else {
        var mc = $('<span />');
        $.each(config.menu, function(i, v) {
          var b = create_button(v);
          popover_cbtns.push(b);
          b.appendTo(mc);
        });
      }
      el.popover({
        placement: 'bottom',
        html: true,
        trigger: 'click',
        content: mc
      });
      el.attr('data-toggle', 'popover');
      a = function(e) {
        e.preventDefault();
        e.stopPropagation();
        $('[data-toggle="popover"]').popover('hide');
        if (!el.hasClass('busy') || config['allow-if-busy']) el.popover('show');
      };
    } else if (config.slider && is_btn) {
      el.addClass('menu');
      set_el_busy_lvar(config.busy, el);
      var min = config.slider.min;
      var max = config.slider.max;
      var step = config.slider.step;
      var off_allowed = config.slider.can_off;
      if (min === undefined || min === null) min = 0;
      if (max === undefined || max === null) max = 100;
      if (step == undefined || step === null) step = 1;
      var mc = $('<span />');
      var slc = $('<div />').addClass('eva_hmi_slider_container');
      var slider = $('<input />', {
        id: 'eva_hmi_slider_' + item,
        type: 'range',
        min: min - (off_allowed ? step : 0),
        max: max
      }).addClass('eva_hmi_slider');
      var slider_label = $('<div />', {
        id: 'eva_hmi_slider_label_' + item
      }).addClass('eva_hmi_slider_label');
      slider.on('input change', function() {
        var val = this.value;
        if (val < min) {
          val = 'OFF';
          slider.removeClass('slider_on');
          slider.addClass('slider_off');
        } else {
          slider.removeClass('slider_off');
          slider.addClass('slider_on');
        }
        slider_label.html(
          val + (config.value && val >= min ? config.value : '')
        );
      });
      slider.attr('step', step);
      slider.on('mouseup touchend', function() {
        $('[data-toggle="popover"]').popover('hide');
        var params = $.extend({}, config.action_params);
        var val = slider.val();
        if (action.startsWith('unit:')) {
          if (val < min) {
            params['s'] = 0;
          } else {
            params['s'] = 1;
            params['v'] = val;
          }
          let afunc = create_api_action(
            'action',
            action,
            params,
            el,
            config,
            is_btn
          );
          afunc();
        } else if (action.startsWith('lvar:')) {
          var v;
          v = val < min ? null : val;
          let afunc = create_api_action(
            'set',
            action,
            {v: v},
            el,
            config,
            is_btn
          );
          afunc();
        } else if (action.startsWith('lmacro:')) {
          var params = $.extend({}, config.action_params);
          if (val < min) {
            params['a'] = 'OFF';
          } else {
            params['a'] = val;
          }
          let afunc = create_api_action(
            'run',
            action,
            params,
            el,
            config,
            is_btn
          );
          afunc();
        }
      });
      slider_update_funcs[item] = function(state) {
        if (state.status || !off_allowed) {
          slider.val(state.value);
          slider_label.html(
            state.value +
              (config.value && state.value >= min ? config.value : '')
          );
          slider.removeClass('slider_off');
          slider.addClass('slider_on');
        } else {
          slider.val(min - step);
          slider_label.html('OFF');
          slider.removeClass('slider_on');
          slider.addClass('slider_off');
        }
      };
      slc.append(slider);
      slc.append(slider_label);
      mc.append(slc);
      el.popover({
        placement: 'bottom',
        html: true,
        trigger: 'click',
        content: mc
      });
      el.attr('data-toggle', 'popover');
      a = function(e) {
        e.preventDefault();
        e.stopPropagation();
        $('[data-toggle="popover"]').popover('hide');
        if (!el.hasClass('busy') || config['allow-if-busy']) el.popover('show');
      };
    } else if (action.startsWith('unit:')) {
      if (config.action_params && 's' in config.action_params) {
        a = create_api_action(
          'action',
          action,
          config.action_params,
          el,
          config,
          is_btn
        );
      } else {
        a = create_api_action(
          'action_toggle',
          action,
          config.action_params,
          el,
          config,
          is_btn
        );
      }
    } else if (action.startsWith('lvar:')) {
      if (config.action_params && 'v' in config.action_params) {
        a = create_api_action(
          'set',
          action,
          config.action_params,
          el,
          config,
          is_btn
        );
      } else {
        a = create_api_action('toggle', action, null, el, config, is_btn);
      }
    } else if (action.startsWith('lmacro:')) {
      if (is_btn) el.addClass('gear');
      var params = $.extend({}, config.action_params);
      a = create_api_action('run', action, params, el, config, is_btn);
    } else if (action.startsWith('url:')) {
      a = function() {
        document.location = action.substring(4);
      };
    } else if (action.startsWith('javascript:')) {
      a = function() {
        eval(action);
      };
    }
    if (a) {
      el.on('click', a);
      if (!is_btn) {
        el.css('cursor', 'pointer');
      }
    }
  }

  function create_button(btn_name) {
    if (
      !window.eva_hmi_config_buttons ||
      !(btn_name in window.eva_hmi_config_buttons)
    ) {
      $eva.hmi.error('Button ' + btn_name + ' is not defined');
    }
    var btn_config = window.eva_hmi_config_buttons[btn_name];
    var button = $('<button />', {id: 'eva_hmi_cbtn_' + btn_name});
    button.addClass('eva_hmi_cbtn');
    $.each(btn_config.icon.split('.'), function(i, v) {
      button.addClass((i == 0 ? 'i_' : '') + v);
    });
    if (btn_config.title) {
      $('<span />')
        .addClass('title')
        .html(btn_config.title)
        .appendTo(button);
    }
    var button_value = null;
    if (btn_config.value !== false || btn_config.timer) {
      button_value = $('<span />');
      var bv = $('<span />').addClass('value');
      bv.append(button_value);
      var button_value_units = $('<span />');
      bv.append(button_value_units);
      button.append(bv);
      var value_always = btn_config['value-always'];
      var value_units = btn_config.value;
    }
    var item = btn_config.item;
    var istatus = btn_config.status;
    var timer = btn_config.timer;
    if (timer) {
      let timer_max = btn_config['timer-max'];
      let timer_func = function() {
        let exp = $eva.expires_in(timer);
        if (exp > 0) {
          button_value.html(seconds_to_pretty_string(exp, timer_max));
        } else {
          button_value.html('');
        }
      };
      timers.push(setInterval(timer_func, 100));
    }
    if (!istatus) istatus = item;
    button.custom_busy = false;
    append_action(button, btn_config, true, istatus);
    if (istatus) {
      if (istatus.startsWith('unit:')) {
        button.addClass('s_');
        $eva.watch(istatus, function(state) {
          if (istatus in slider_update_funcs) {
            slider_update_funcs[istatus](state);
          }
          button.attr(
            'class',
            button
              .attr('class')
              .replace(
                /\bs_\d*/g,
                's_' + (state.status >= 0 ? state.status : 0)
              )
          );
          if (state.status == -1) {
            button.append($('<span />', {class: 'eva_hmi_cbtn_error'}));
          } else {
            button.find('.eva_hmi_cbtn_error').remove();
          }
          if (button_value) {
            if (!timer) {
              if (state.status > 0 || value_always) {
                button_value.html(state.value);
                button_value_units.html(value_units);
              } else {
                button_value.html('');
                button_value_units.html('');
              }
            }
          }
          if (!button.custom_busy) {
            if (state.status != state.nstatus || state.value != state.nvalue) {
              button.addClass('busy');
            } else {
              button.removeClass('busy');
            }
          }
        });
      } else if (istatus.startsWith('lvar:')) {
        if (istatus in slider_update_funcs) {
          slider_update_funcs[istatus](state);
        }
        button.addClass('s_');
        $eva.watch(istatus, function(state) {
          button.attr(
            'class',
            button.attr('class').replace(/\bs_.*/g, 's_' + state.value)
          );
        });
      }
    }
    return button;
  }

  function create_data_item(data_item_id) {
    if (
      !window.eva_hmi_config_data ||
      !(data_item_id in window.eva_hmi_config_data)
    ) {
      $eva.hmi.error('data item ' + data_item_id + ' is not defined');
    }
    var data_item_config = window.eva_hmi_config_data[data_item_id];
    var data_item = $('<div />');
    var data_item_value = $('<span />', {
      id: 'eva_hmi_data_value_' + data_item_id
    });
    if ('title' in data_item_config) {
      $('<span />')
        .html(data_item_config['title'] + ':')
        .addClass('eva_hmi_data_item_title')
        .appendTo(data_item);
    }
    data_item.append(data_item_value);
    $('<span />')
      .html(data_item_config['units'])
      .appendTo(data_item);
    data_item.attr('eva-display-decimals', data_item_config['decimals']);
    data_item.addClass('eva_hmi_data_item');
    data_item.addClass('i_' + data_item_config.icon);
    data_item.css('background-repeat', 'no-repeat');
    append_action(data_item, data_item_config, false);
    var item = data_item_config['item'];
    $eva.watch(item, function(state) {
      var v = state.value;
      var dc = data_item.attr('eva-display-decimals');
      if (dc !== undefined && dc !== null && !isNaN(v)) {
        try {
          v = parseFloat(v).toFixed(dc);
        } catch (e) {}
      }
      data_item_value.html(v);
    });
    return data_item;
  }

  function recreate_objects() {
    $.each(chart_creators, function(i, v) {
      v();
    });
  }

  function run() {
    redraw_layout();
    stop_animation();
    content_holder.show();
    recreate_objects();
  }

  function init() {
    initialized = true;
    if (!$eva.in_evaHI) {
      document.addEventListener('swiped-right', function(e) {
        if (!menu_active) {
          open_menu();
        }
      });

      document.addEventListener('swiped-left', function(e) {
        if (menu_active) {
          close_menu();
        }
      });
    }
    if (!window.eva_hmi_config) {
      error('HMI config not loaded');
    }
    if (!window.eva_hmi_config_url)
      window.eva_hmi_config_url = document.location;
    if (typeof window.evaHI === 'object' && window.evaHI['index']) {
      window.eva_hmi_config_main_page = window.evaHI['index'];
    } else {
      window.eva_hmi_config_main_page = '/ui/';
    }
    if ('url' in window.eva_hmi_config) {
      window.eva_hmi_config_url = window.eva_hmi_config['url'];
    }
    if ('class' in window.eva_hmi_config) {
      window.eva_hmi_config_class = window.eva_hmi_config['class'];
    }
    if ('info-level' in window.eva_hmi_config) {
      window.eva_hmi_config_info_level = window.eva_hmi_config['info-level'];
    } else {
      window.eva_hmi_config_info_level = 'info';
    }
    if ('title' in window.eva_hmi_config) {
      window.eva_hmi_config_title = window.eva_hmi_config['title'];
    }
    if ('motd' in window.eva_hmi_config) {
      window.eva_hmi_config_motd = window.eva_hmi_config['motd'];
    }
    if ('default-login' in window.eva_hmi_config) {
      $eva.login = window.eva_hmi_config['default-login'];
    }
    window.eva_hmi_config_layout = $.extend(
      window.eva_hmi_config_layout,
      window.eva_hmi_config['layout']
    );
    window.eva_hmi_config_layout_compact = $.extend(
      window.eva_hmi_config_layout_compact,
      window.eva_hmi_config['layout-compact']
    );
    $('body').empty();
    $('body').on('click', function(e) {
      if (
        $(e.target).data('toggle') !== 'popover' &&
        $(e.target).parents('.popover.in').length === 0
      ) {
        $('[data-toggle="popover"]').popover('hide');
      }
      if (
        $(e.target).data('toggle') !== 'menu' &&
        $(e.target).data('toggle') != 'menuicon' &&
        $(e.target)
          .parents()
          .data('toggle') != 'menuicon'
      ) {
        close_menu();
      }
    });
    $('<div />', {id: 'eva_hmi_popup'}).appendTo('body');
    $('<div />', {id: 'eva_hmi_anim'}).appendTo('body');
    $('<div />')
      .addClass('eva_hmi_dialog_window_holder')
      .addClass('evacc_setup')
      .on('click', close_cc_setup)
      .html(
        '<div class="eva_hmi_dialog_window"> \
            <div class="eva_hmi_setup_form"> \
              <div class="eva_hmi_close_btn"></div> \
              <a href="https://play.google.com/store/apps/details?id=com.altertech.evacc" \
              class="eva_hmi_andr_app"></a> \
              <span>Scan this code with </span> \
              <a href="https://play.google.com/store/apps/details?id=com.altertech.evacc" \
                class="eva_hmi_app_link">EVA Control Center app</a> \
              <div class="eva_hmi_qr_install"><canvas id="evaccqr"></canvas></div> \
            </div> \
          </div>'
      )
      .appendTo('body');
    if (
      window.eva_hmi_config_class == 'dashboard' ||
      window.eva_hmi_config_class == 'simple'
    ) {
      window.eva_hmi_config_buttons = $.extend(
        window.eva_hmi_config_buttons,
        window.eva_hmi_config['buttons']
      );
      window.eva_hmi_config_data = $.extend(
        window.eva_hmi_config_data,
        window.eva_hmi_config['data']
      );
      window.eva_hmi_config_data_blocks = $.extend(
        window.eva_hmi_config_data_blocks,
        window.eva_hmi_config['data-blocks']
      );
      window.eva_hmi_config_control_blocks = $.extend(
        window.eva_hmi_config_control_blocks,
        window.eva_hmi_config['control-blocks']
      );
      window.eva_hmi_config_cameras = $.extend(
        window.eva_hmi_config_cameras,
        window.eva_hmi_config['cameras']
      );
      login_window = $('<div >/', {
        id: 'login_window'
      }).addClass('eva_hmi_dialog_window_holder');
      login_window.hide();
      login_window.html(
        '<div class="eva_hmi_dialog_window"> \
        <form id="eva_hmi_login_form"> \
          <div class="form-group eva_hmi_input_form"> \
            <div class="eva_hmi_error_message" id="eva_hmi_login_error"></div> \
            <input type="text" class="form-control" name="login" \
                id="eva_hmi_login" value="" placeholder="User"/> \
            <input type="password" class="form-control" \
                name="password" id="eva_hmi_password" \
                value="" placeholder="Password"/> \
          </div> \
          <div class="form-group eva_hmi_custom_checkbox"> \
            <input type="checkbox" id="eva_hmi_remember_auth"/> \
            <label for="eva_hmi_remember_auth">Remember me</label> \
          </div> \
          <div class="form-group"> \
            <input type="submit" class="btn" value="Log in"/> \
          </div> \
        </form> \
      </div>'
      );
      login_window.appendTo('body');
      $('#eva_hmi_login_form').on('submit', submit_login);
      if (window.eva_hmi_config_motd) {
        var motd = $('<div />')
          .addClass('eva_hmi_motd')
          .html(window.eva_hmi_config_motd);
        $('#eva_hmi_login_form').append(motd);
      }
      var cnt = $('<div />').addClass('eva_hmi_container');
      var main = $('<div />', {id: 'eva_hmi_main'});
      var container = $('<div />').addClass('container');
      var row = $('<div />').addClass('row');
      $('<div />').addClass('eva_hmi_bg').appendTo('body');
      cnt.appendTo('body');
      main.appendTo(cnt);
      container.appendTo(main);
      row.appendTo(container);
      content_holder = $('<div />').addClass('eva_hmi_content_holder');
      content_holder.hide();
      content_holder.appendTo(row);
      $eva.on('login.success', function() {
        login_window.hide();
        update_sysblock();
        run();
      });
      $eva.on('heartbeat.error', function() {
        $eva
          .stop(true)
          .then(server_is_gone)
          .catch(server_is_gone);
      });
      $eva.on('login.failed', function(err) {
        stop_intervals();
        if (err.code == 2) {
          stop_animation();
          erase_login_cookies();
          content_holder.hide();
          login_window.show();
          if (first_time_login) {
            first_time_login = false;
          } else {
            $('#eva_hmi_login_error').html(err.message);
            $('#eva_hmi_login_error').show();
          }
          $('#eva_hmi_login').val($eva.login);
          $('#eva_hmi_password').val('');
          focus_login_form();
        } else {
          server_is_gone(err);
        }
      });
    } else if (window.eva_hmi_config_class == 'sensors') {
      if ('main-page' in window.eva_hmi_config) {
        window.eva_hmi_config_main_page = window.eva_hmi_config['main-page'];
      }
      window.eva_hmi_config_charts = $.extend(
        window.eva_hmi_config_charts,
        window.eva_hmi_config['charts']
      );
      $eva.on('login.success', function() {
        update_sysblock();
        run();
      });
      $eva.on('login.failed', function(err) {
        document.location = window.eva_hmi_config_main_page;
      });
      var cnt = $('<div />')
        .addClass('eva_hmi_container')
        .addClass('sensors');
      content_holder = $('<div />').addClass('eva_hmi_content_holder_sensors');
      content_holder.hide();
      content_holder.appendTo(cnt);
      if (window.eva_hmi_config_layout['sys-block']) {
        cnt.append(create_sysblock());
      }
      $('<div />').addClass('eva_hmi_bg').appendTo('body');
      cnt.appendTo('body');
    }
    var reload_ui = function() {
      document.location = document.location;
    };
    $eva.on('server.reload', function() {
      var ct = 5;
      var ui_reloader = setTimeout(reload_ui, ct * 1000);
      $eva.toolbox
        .popup(
          'eva_hmi_popup',
          'warning',
          'UI reload',
          'Server asked clients to reload UI',
          {
            ct: ct,
            btn1: 'Reload'
          }
        )
        .then(function() {
          clearTimeout(ui_reloader);
          reload_ui();
        })
        .catch(err => {});
    });
    $eva.on('server.restart', function() {
      var ct = 15;
      stop_intervals();
      $eva.stop(true).catch(err => {});
      $eva.toolbox
        .popup(
          'eva_hmi_popup',
          'warning',
          'Server restart',
          'Server is being restarted, UI will be reconnected in' +
            ` ${ct} seconds. All functions are stopped`,
          {
            ct: ct
          }
        )
        .catch(err => {});
      setTimeout(function() {
        $eva.start();
      }, ct * 1000);
    });
  }

  function focus_login_form() {
    if ($eva.login) {
      $('#eva_hmi_login').val($eva.login);
      $('#eva_hmi_password').focus();
    } else {
      $('#eva_hmi_login').focus();
    }
  }

  function update_sysblock() {
    if ($eva.server_info) {
      $('.eva_version').html($eva.server_info.version);
      $('.eva_build').html($eva.server_info.product_build);
      $('.eva_key_id').html($eva.server_info.acl.key_id);
      $('.eva_user').html($eva.authorized_user);
    }
  }

  function stop_intervals() {
    while (camera_reloader.length > 0) {
      let reloader = camera_reloader.pop();
      clearInterval(reloader);
    }
    while (timers.length > 0) {
      let reloader = timers.pop();
      clearInterval(reloader);
    }
  }

  function draw_top_bar() {
    var topbar = $('<div />', {id: 'eva_hmi_top_bar'});
    var hamb = $('<div />', {'data-toggle': 'menuicon', id: 'eva_hmi_hamb'});
    for (var i = 0; i < 3; i++) {
      $('<span />').appendTo(hamb);
    }
    hamb.on('click', toggle_menu);
    topbar.append(hamb);
    topbar.append(create_sysblock(true, 'eva_hmi_top_bar_sysblock'));
    content_holder.addClass('with_topbar');
    content_holder.append(topbar);
    $('#vanillatoasts-container').css('top', '35px');
    var menu_container = $('<div />', {id: 'eva_hmi_menu_container'});
    var menu_holder = $('<div />', {id: 'eva_hmi_menu', 'data-toggle': 'menu'});
    var menu = $('<div />', {class: 'eva_hmi_menu_holder'});
    menu_holder.append(menu);
    if (typeof window.evaHI === 'object' && window.evaHI['home_icon']) {
      menu.append(
        create_menu_item(
          'Home',
          '/' + window.evaHI['home_icon'],
          window.eva_hmi_config_main_page
        ).addClass('eva_hmi_menu_page')
      );
      topbar.append(
        create_menu_item(
          'Home',
          '/' + window.evaHI['home_icon'],
          window.eva_hmi_config_main_page
        )
      );
    } else {
      menu.append(
        create_menu_item(
          'Home',
          'home',
          window.eva_hmi_config_main_page
        ).addClass('eva_hmi_menu_page')
      );
      topbar.append(
        create_menu_item('Home', 'home', window.eva_hmi_config_main_page)
      );
    }
    if (typeof window.evaHI === 'object' && window.evaHI['menu']) {
      $.each(window.evaHI['menu'], function(i, v) {
        menu.append(
          create_menu_item(v['name'], '/' + v['icon'], v['url']).addClass(
            'eva_hmi_menu_page'
          )
        );
        topbar.append(
          create_menu_item(v['name'], '/' + v['icon'], v['url'], true)
        );
      });
    }
    menu.append(create_menu_item('EvaCC setup', 'evahi', open_cc_setup));
    menu.append(create_menu_item('Logout', 'logout', logout));
    menu.append(
      $('<div />')
        .addClass('eva_hmi_logo_container')
        .append(
          $('<div />')
            .addClass('eva_hmi_logo')
            .html($eva.hmi.logo.text)
            .on('click', function() {
              document.location = $eva.hmi.logo.href;
            })
        )
    );
    content_holder.append(menu_container);
    content_holder.append(menu_holder);
  }

  function create_menu_item(title, icon, action, for_topbar) {
    var menu_item = $('<div />');
    menu_item.addClass('eva_hmi_menu_item');
    var menu_icon = $('<div />');
    menu_icon.addClass('eva_hmi_menu_icon');
    if (!icon.startsWith('/')) {
      menu_icon.addClass('i_' + icon + (for_topbar ? '_tb' : ''));
    } else {
      menu_icon.css('background-image', 'url(/.evahi/icons' + icon + ')');
      menu_icon.addClass('i_evahi_icon');
    }
    menu_icon.attr('title', title);
    menu_item.append(menu_icon);
    menu_item.append(
      $('<div />')
        .addClass('eva_hmi_menu_title')
        .html(title)
    );
    if (typeof action === 'function') {
      menu_item.on('click', action);
    } else {
      menu_item.on('click', function() {
        document.location = action;
      });
    }
    return menu_item;
  }

  function toggle_menu() {
    if (menu_active) {
      close_menu();
    } else {
      open_menu();
    }
  }

  function open_menu() {
    $('body').css('overflow', 'hidden');
    menu_active = true;
    $('#eva_hmi_hamb').addClass('open');
    $('#eva_hmi_menu').animate({width: 'toggle'}, 250);
    $('#eva_hmi_menu_container').fadeIn(250);
  }

  function close_menu() {
    if (menu_active) {
      $('body').css('overflow', 'auto');
      menu_active = false;
      $('#eva_hmi_hamb').removeClass('open');
      $('#eva_hmi_menu').animate({width: 'toggle'}, 250);
      $('#eva_hmi_menu_container').fadeOut(250);
    }
  }

  function correct_cbtn_padding() {
    var padding = ($(window).width() - 24) / 8 - 10;
    var max_padding = 40;
    if (padding > max_padding) padding = max_padding;
    if (padding < 0) padding = 0;
    $('.eva_hmi_cbtn').css('padding', padding);
    $.each(popover_cbtns, function(i, v) {
      v.css('padding', padding);
    });
  }

  function clear_layout() {
    content_holder.empty();
    popover_cbtns = Array();
    $eva.unwatch();
  }

  function redraw_layout() {
    clear_layout();
    $eva.hmi.prepare_layout();
    $eva.hmi.top_bar();
    stop_intervals();
    chart_creators = Array();
    if ($(window).width() < 768) {
      draw_compact_layout();
      current_layout_compact = true;
      correct_cbtn_padding();
    } else {
      draw_layout();
      current_layout_compact = false;
    }
    update_sysblock();
    $eva.hmi.after_draw(current_layout_compact);
  }

  function create_data_block(block_id) {
    var dh = $('<div />').addClass('eva_hmi_data_holder');
    if (
      !window.eva_hmi_config_data_blocks ||
      (!(block_id in window.eva_hmi_config_data_blocks) ||
        !('elements' in window.eva_hmi_config_data_blocks[block_id]))
    ) {
      $eva.hmi.error(
        'data block ' + block_id + ' is not defined or contains no elements'
      );
    }
    var config = window.eva_hmi_config_data_blocks[block_id];
    if ('size' in config) {
      dh.addClass('size_' + config['size']);
    }
    if ('css-class' in config) {
      dh.addClass(config['css-class']);
    }
    $.each(config['elements'], function(i, v) {
      dh.append(create_data_item(v));
    });
    append_action(dh, window.eva_hmi_config_data_blocks[block_id], false);
    return dh;
  }

  function create_cam(cam_cfg, big) {
    if (!cam_cfg || !('id' in cam_cfg)) {
      $eva.hmi.error('Invalid camera block');
    }
    if (
      !window.eva_hmi_config_cameras ||
      !(cam_cfg['id'] in window.eva_hmi_config_cameras)
    ) {
      $eva.hmi.error('Camera ' + cam_cfg['id'] + ' is not defined');
    }
    var cam_id = cam_cfg['id'];
    var reload_int = cam_cfg['reload'];
    if (!reload_int) reload_int = 1;
    var cam = $('<div />').addClass('eva_hmi_camera_block');
    var cam_img = $('<img />').attr('id', 'eva_hmi_camera_' + cam_id);
    if (!big) {
      cam_img.addClass('eva_hmi_cam_preview');
    } else {
      cam_img.addClass('eva_hmi_cam_preview_big');
    }
    cam_img.addClass('eva_hmi_cam_img');
    cam_img.appendTo(cam);
    var reloader = setInterval(function() {
      reload_camera(cam_id);
    }, reload_int * 1000);
    camera_reloader.push(reloader);
    append_action(cam, cam_cfg, false);
    return cam;
  }

  function format_chart_config(cfg_id, chart_cfg) {
    return chart_cfg;
  }

  function create_chart_config(config) {
    var c_type = config['type'] ? config['type'] : 'line';

    var item;
    if (!('item' in config)) {
      $eva.hmi.error('No item in chart config');
    }
    if (Array.isArray(config['item'])) {
      item = config['item'];
    } else {
      item = config['item'].split(',');
    }
    var chart_cfg = {
      type: c_type,
      data: {
        labels: [],
        datasets: []
      },
      options: $.extend({}, eva_hmi_config_chart_options)
    };
    var count = item.length;
    if (Array.isArray(config['params']['timeframe'])) {
      count *= config['params']['timeframe'].length;
    }
    for (let i = 0; i < count; i++) {
      if (Array.isArray(config['label'])) {
        var c_label = config['label'][i];
      } else {
        var c_label = config['label'] ? config['label'] : 'start';
      }
      if (Array.isArray(config['fill'])) {
        var c_fill = config['fill'][i];
      } else {
        var c_fill = config['fill'] ? config['fill'] : 'start';
      }
      if (Array.isArray(config['color'])) {
        var c_color = config['color'][i];
      } else {
        var c_color = config['color'] ? config['color'] : '#aaaaaa';
      }
      if (Array.isArray(config['pointr'])) {
        var c_pointr = config['point-radius'][i];
      } else {
        var c_pointr = config['point-radius'] ? config['point-radius'] : 0;
      }
      if (Array.isArray(config['background-color'])) {
        var c_background = config['background-color'][i];
      } else {
        var c_background = config['background-color']
          ? config['background-color']
          : '#eeeeee';
      }
      var dataset = {
        label: c_label,
        data: [],
        fill: c_fill,
        pointRadius: c_pointr,
        borderColor: c_color,
        backgroundColor: c_background
      };
      chart_cfg.data.datasets.push(dataset);
    }
    if (config['cfg'] && config['cfg'] != 'default') {
      $eva.hmi.format_chart_config(config['cfg'], chart_cfg);
    }
    return chart_cfg;
  }

  function create_chart(chart_id, reload) {
    var reload_int = reload;
    var chart_config = window.eva_hmi_config_charts[chart_id];
    if (!chart_config) {
      $eva.hmi.error('No config for chart ' + chart_id);
    }
    if (!reload_int) reload_int = 60;
    var chart = $('<div />').addClass('eva_hmi_chart_item');
    var chart_title = chart_config['title'];
    if (!chart_title) chart_title = '&nbsp;';
    $('<div />')
      .addClass('eva_hmi_chart_title')
      .html(chart_title)
      .appendTo(chart);
    var chart_info = $('<div />')
      .addClass('i_' + chart_config['icon'])
      .addClass('eva_hmi_chart_value')
      .addClass('eva_hmi_data_item');
    chart_info.css('background-position', '20px 0');
    chart_info.css('background-repeat', 'no-repeat');
    var chart_item_state = $('<span />', {
      id: 'eva_hmi_chart_' + chart_id + '_state'
    }).appendTo(chart_info);
    chart_item_state.attr('eva-display-decimals', chart_config['decimals']);
    $('<span />')
      .html(chart_config['units'])
      .appendTo(chart_info);
    chart.append(chart_info);
    if (
      'params' in chart_config &&
      chart_config['params']['prop'] == 'status'
    ) {
      $eva.watch(chart_config['item'], function(state) {
        chart_item_state.html(state.status);
      });
    } else {
      $eva.watch(chart_config['item'], function(state) {
        var v = state.value;
        var dc = chart_item_state.attr('eva-display-decimals');
        if (dc !== undefined && dc !== null && !isNaN(v)) {
          try {
            v = parseFloat(v).toFixed(dc);
          } catch (e) {}
        }
        chart_item_state.html(v);
      });
    }
    $('<div />')
      .addClass('eva_hmi_chart_value_units')
      .html(chart_config['units'])
      .appendTo(chart);
    $('<div />', {id: 'eva_hmi_chart_content_' + chart_id})
      .addClass('eva_hmi_chart')
      .appendTo(chart);
    var params = $.extend({}, chart_config.params);
    params['update'] = reload_int;
    params['units'] = chart_config['units'];
    var ccfg = create_chart_config(chart_config);
    var creator = function() {
      $eva.toolbox.chart(
        'eva_hmi_chart_content_' + chart_id,
        ccfg,
        chart_config['item'],
        params
      );
    };
    chart_creators.push(creator);
    return chart;
  }

  function draw_layout(for_compact) {
    var cams = Array();
    if (window.eva_hmi_config_class == 'dashboard') {
      var eva_bar_holder = $('<div />', {class: 'eva_hmi_bar_holder'});
      for (i = 1; i < 20; i++) {
        if ('bar' + i in window.eva_hmi_config_layout) {
          var bar = $('<div />').addClass('eva_hmi_bar');
          var bar_cfg = window.eva_hmi_config_layout['bar' + i];
          if ('camera' in bar_cfg) {
            var cam = create_cam(bar_cfg['camera']);
            bar.append(cam);
            cams.push(bar_cfg['camera']['id']);
          }
          var fcb = true;
          if ('control-blocks' in bar_cfg) {
            $.each(bar_cfg['control-blocks'], function(i, v) {
              var cb = create_control_block(v);
              if (!('camera' in bar_cfg)) {
                cb.css('border-top', '0px');
              }
              bar.append(cb);
              fcb = false;
            });
          }
          var dblk = null;
          if (bar_cfg['data-block']) {
            if (!dblk) dblk = $('<div />').addClass('eva_hmi_data_block');
            dblk.append(create_data_block(bar_cfg['data-block']));
          }
          if (bar_cfg['sys-block']) {
            if (!dblk) dblk = $('<div />').addClass('eva_hmi_data_block');
            dblk.append(create_sysblock());
          }
          if (dblk) bar.append(dblk);
          eva_bar_holder.append(bar);
          content_holder.append(eva_bar_holder);
        }
      }
    } else if (window.eva_hmi_config_class == 'sensors') {
      if (!$eva.in_evaHI) {
        $('<a />')
          .attr('href', window.eva_hmi_config_main_page)
          .addClass('eva_hmi_close_btn')
          .addClass('secondary_page')
          .appendTo(content_holder);
      }
      $.each(window.eva_hmi_config_layout['charts'], function(i, v) {
        var chart = create_chart(v['id'], v['reload']);
        content_holder.append(chart);
      });
    } else if (window.eva_hmi_config_class == 'simple') {
      var holder = $('<div />', {
        class: 'eva_hmi_bar_holder single_bar_holder'
      });
      if ('camera' in window.eva_hmi_config_layout) {
        var cam = create_cam(window.eva_hmi_config_layout['camera'], true);
        holder.append(cam);
        cams.push(window.eva_hmi_config_layout['camera']['id']);
      }
      if ('buttons' in window.eva_hmi_config_layout) {
        $.each(window.eva_hmi_config_layout['buttons'], function(i, v) {
          var btn = create_button(v);
          holder.append(btn);
        });
      }
      if (window.eva_hmi_config_layout.sysblock) {
        holder.append(create_sysblock());
      }
      content_holder.append(holder);
    }
    if (!for_compact) {
      content_holder.removeClass('compact');
    } else {
      content_holder.addClass('compact');
    }
    $.each(cams, function(i, v) {
      reload_camera(v);
    });
  }

  function create_sysblock(mini, cl_id) {
    var sysblock = $('<div />')
      .addClass(cl_id ? cl_id : 'eva_hmi_sysblock')
      .html(
        'EVA ICS v<span class="eva_version"></span>, \
    build <span class="eva_build"></span>, \
    user: <span class="eva_user"></span>'
      );
    if (!mini) {
      sysblock.append($('<br />'));
      if (!$eva.in_evaHI) {
        $('<span />')
          .addClass('eva_hmi_links')
          .css('margin-right', '10px')
          .on('click', open_cc_setup)
          .html('EvaCC setup')
          .appendTo(sysblock);
      }
      $('<span />')
        .addClass('eva_hmi_links')
        .on('click', logout)
        .html('Logout')
        .appendTo(sysblock);
    }
    return sysblock;
  }

  function draw_compact_layout() {
    if (
      !window.eva_hmi_config_layout_compact ||
      !('elements' in window.eva_hmi_config_layout_compact)
    )
      return draw_layout(true);
    var cams = Array();
    if (window.eva_hmi_config_class == 'dashboard') {
      var row = $('<div />', {class: 'mob_layout'});
      var fcb = true;
      $.each(window.eva_hmi_config_layout_compact['elements'], function(i, v) {
        if (v['type'] == 'control-block') {
          var cb = create_control_block(v['id']);
          if (fcb) {
            cb.css('border-top', '0px');
            fcb = false;
          }
          row.append(cb);
        } else {
          fcb = true;
          if (v['type'] == 'data-block') {
            var data_block = $('<div />', {class: 'eva_hmi_data_block'});
            data_block.append(create_data_block(v['id']));
            row.append(data_block);
          } else if (v['type'] == 'sys-block') {
            row.append(create_sysblock());
          } else if (v['type'] == 'spacer') {
            var h = v['height'];
            if (!h) h = '12px';
            $('<div />')
              .css('height', h)
              .appendTo(row);
          } else if (v['type'] == 'camera') {
            var reload_int = v['reload'];
            if (!reload_int) reload_int = 1;
            var cam = create_cam(v);
            row.append(cam);
            cams.push(v['id']);
          }
        }
      });
      content_holder.append(row);
      content_holder.addClass('compact');
    } else if (
      window.eva_hmi_config_class == 'sensors' ||
      window.eva_hmi_config_class == 'simple'
    ) {
      return draw_layout(true);
    }
    $.each(cams, function(i, v) {
      reload_camera(v);
    });
  }

  function submit_login(e) {
    e.preventDefault();
    try {
      $eva.login = $('#eva_hmi_login').val();
      $eva.password = $('#eva_hmi_password').val();
      if ($('#eva_hmi_remember_auth').prop('checked')) {
        window.$cookies.create('eva_hmi_login', $eva.login, 365);
        window.$cookies.create('eva_hmi_password', $eva.password, 365);
      }
      start_animation();
      $eva.start();
    } catch (err) {}
    return false;
  }

  function start() {
    if (!initialized) init();
    if (window.eva_hmi_config_title) {
      document.title = window.eva_hmi_config_title;
    }
    var oldSize = $(window).width();
    window.addEventListener('resize', function() {
      $('[data-toggle="popover"]').popover('hide');
      var w = $(window).width();
      if (
        (w > 767 && current_layout_compact) ||
        (w < 768 && !current_layout_compact)
      ) {
        redraw_layout();
        recreate_objects();
      }
      if (w < 768) {
        correct_cbtn_padding();
      }
    });
    var l = window.$cookies.read('eva_hmi_login');
    var p = window.$cookies.read('eva_hmi_password');
    if (l && p) {
      $eva.login = l;
      $eva.password = p;
    }
    start_animation();
    $eva.start();
  }

  function start_animation() {
    $('#login_window').hide();
    $('.eva_hmi_container').hide();
    $eva.toolbox.animate('eva_hmi_anim');
    $('#eva_hmi_anim')
      .show()
      .css('display', 'flex');
  }

  function stop_animation() {
    $('#eva_hmi_anim').hide();
    $('#eva_hmi_anim').empty();
    $('.eva_hmi_container').show();
  }

  function open_cc_setup(e) {
    if (!btn_coord) {
      window.addEventListener('resize', function() {
        var target = $('#eva_hmi_ccsetup_btn')[0];
        btn_coord = {
          x: target.offsetLeft - $(window).scrollLeft() + 30,
          y: target.offsetTop - $(window).scrollTop() + 5
        };
        $('#evscc_setup_btn');
      });
    }
    $('body').css({overflow: 'hidden'});
    btn_coord = {
      x: e.target.offsetLeft - $(window).scrollLeft() + 30,
      y: e.target.offsetTop - $(window).scrollTop() + 5
    };
    $eva.hiQR('evaccqr', {url: window.eva_hmi_config_url, password: null});
    $('.eva_hmi_setup_form').css({
      top: btn_coord.y,
      left: btn_coord.x
    });
    $('.evacc_setup').fadeIn();
    $('.eva_hmi_setup_form').css({
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%) scale(1)'
    });
  }

  function close_cc_setup(e) {
    if (e) {
      if (
        e.target != $('.setup_form')[0] &&
        $(e.target).closest('.setup_form').length === 0
      ) {
        $('.eva_hmi_setup_form').css({
          top: btn_coord.y,
          left: btn_coord.x,
          transform: 'translate(-50%, -50%) scale(0)'
        });
        $('.evacc_setup').fadeOut();
        $('body').css({overflow: 'auto'});
      }
    } else {
      $('.eva_hmi_setup_form').css({
        top: btn_coord.y,
        left: btn_coord.x,
        transform: 'translate(-50%, -50%) scale(0)'
      });
      $('.evacc_setup').fadeOut();
      $('body').css({overflow: 'auto'});
    }
  }

  function reload_camera(cam_id) {
    var src = $eva.hmi.format_camera_src(cam_id);
    if (!src) {
      src = window.eva_hmi_config_cameras[cam_id]['image'].replace(
        '$NOCACHE',
        Date.now()
      );
    }
    $('#eva_hmi_camera_' + cam_id).attr('src', src);
  }

  function erase_login_cookies() {
    window.$cookies.erase('eva_hmi_login');
    window.$cookies.erase('eva_hmi_password');
  }

  function seconds_to_pretty_string(seconds, max) {
    seconds = seconds.toFixed(1);
    var result = '';

    var spacer = parseInt(seconds * 2) % 2 ? ':' : '&nbsp;';

    spacer =
      '<div style="width: 5px; display: inline-block">' + spacer + '</div>';

    if (seconds < 60 || max == 'seconds') {
      var sec = Math.floor(seconds);
      var mill = Math.round((seconds - sec) * 10);
      result = sec + '.' + mill;
    } else if ((seconds >= 60 && seconds < 3600) || max == 'minutes') {
      var min = Math.floor(seconds / 60);
      var sec = ('0' + Math.floor(seconds % 60)).slice(-2);
      result = min + spacer + sec;
    } else {
      var hour = Math.floor(seconds / 3600);
      var min = ('0' + Math.floor((seconds % 3600) / 60)).slice(-2);
      result = hour + spacer + min;
    }

    return result;
  }

  function logout() {
    var l = function() {
      erase_login_cookies();
      document.location = document.location;
    };
    $eva
      .stop()
      .then(l)
      .catch(err => l);
  }

  function timeConvert(seconds, max) {
    var result = '';

    if(seconds >= 3600) {
      var hour = Math.floor(seconds / 3600);
      var min = ('0' + Math.floor(seconds % 3600 / 60)).slice(-2);
      result = hour + ':' + min;
    } else if(seconds >= 60 && seconds < 3600 || max === 'minute') {
      var min = Math.floor(seconds / 60);
      var sec = ('0' + Math.floor(seconds % 60)).slice(-2);
      result = min + ':' + sec;
    } else if(seconds < 60 || max === 'second') {
      var sec = Math.floor(seconds);
      var mill = Math.round((seconds - sec) * 10);
      result = sec + '.' + mill;
    }

    return result;
  }

  $eva.hmi = {};
  $eva.hmi.init = init;
  $eva.hmi.start = start;
  $eva.hmi.logo = {};
  $eva.hmi.logo.href = 'https://www.eva-ics.com/';
  $eva.hmi.logo.text = 'www.eva-ics.com';
  $eva.hmi.format_camera_src = function() {};
  $eva.hmi.format_cmart_config = format_chart_config();
  $eva.hmi.after_draw = function() {};
  $eva.hmi.prepare_layout = function() {};
  $eva.hmi.error = error;
  $eva.hmi.draw_top_bar = draw_top_bar;
  $eva.hmi.top_bar = function() {
    if (!$eva.in_evaHI) $eva.hmi.draw_top_bar();
  };
})();
