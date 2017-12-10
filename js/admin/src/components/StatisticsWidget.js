/*
 * This file is part of Flarum.
 *
 * (c) Toby Zerner <toby.zerner@gmail.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import DashboardWidget from 'flarum/components/DashboardWidget';
import SelectDropdown from 'flarum/components/SelectDropdown';
import Button from 'flarum/components/Button';
import icon from 'flarum/helpers/icon';
import listItems from 'flarum/helpers/listItems';
import ItemList from 'flarum/utils/ItemList';

export default class StatisticsWidget extends DashboardWidget {
  init() {
    super.init();

    const now = new Date();

    this.entities = ['users', 'discussions', 'posts'];
    this.periods = {
      last_7_days: {start: now - 86400000 * 7, end: now, step: 86400000},
      last_28_days: {start: now - 86400000 * 28, end: now, step: 86400000},
      last_12_months: {start: now - 86400000 * 365, end: now, step: 86400000 * 7}
    };

    this.selectedEntity = 'users';
    this.selectedPeriod = 'last_12_months';
  }

  className() {
    return 'StatisticsWidget';
  }

  content() {
    const thisPeriod = this.periods[this.selectedPeriod];

    return (
      <div className="StatisticsWidget-table">
        <div className="StatisticsWidget-labels">
          <div className="StatisticsWidget-label">{app.translator.trans('flarum-statistics.admin.statistics.total_label')}</div>
          <div className="StatisticsWidget-label">
            <SelectDropdown buttonClassName="Button Button--text" caretIcon="caret-down">
              {Object.keys(this.periods).map(period => (
                <Button active={period === this.selectedPeriod} onclick={this.changePeriod.bind(this, period)}>
                  {app.translator.trans('flarum-statistics.admin.statistics.'+period+'_label')}
                </Button>
              ))}
            </SelectDropdown>
          </div>
        </div>

        {this.entities.map(entity => {
          const thisPeriodCount = this.getPeriodCount(entity, thisPeriod);
          const lastPeriodCount = this.getPeriodCount(entity, this.getLastPeriod(thisPeriod));
          const periodChange = lastPeriodCount > 0 && (thisPeriodCount - lastPeriodCount) / lastPeriodCount * 100;

          return (
            <a className={'StatisticsWidget-entity'+(this.selectedEntity === entity ? ' active' : '')} onclick={this.changeEntity.bind(this, entity)}>
              <h3 className="StatisticsWidget-heading">{app.translator.trans('flarum-statistics.admin.statistics.'+entity+'_heading')}</h3>
              <div className="StatisticsWidget-total">{this.getTotalCount(entity)}</div>
              <div className="StatisticsWidget-period">
                {thisPeriodCount}{' '}
                {periodChange ? (
                  <span className={'StatisticsWidget-change StatisticsWidget-change--'+(periodChange > 0 ? 'up' : 'down')}>
                    {icon('arrow-'+(periodChange > 0 ? 'up' : 'down'))}
                    {Math.abs(periodChange.toFixed(1))}%
                  </span>
                ) : ''}
              </div>
            </a>
          );
        })}

        <div className="StatisticsWidget-chart" config={this.drawChart.bind(this)}/>
      </div>
    );
  }

  drawChart(elm, isInitialized, context) {
    const entity = this.selectedEntity;
    const period = this.periods[this.selectedPeriod];
    const daily = app.data.statistics[this.selectedEntity].daily;
    const labels = [];
    const thisPeriod = [];
    const lastPeriod = [];

    for (let i = period.start; i < period.end; i += period.step) {
      const date = new Date(i);
      date.setHours(0, 0, 0, 0);
      labels.push(moment(date).format('D MMM'));
      thisPeriod.push(this.getPeriodCount(entity, {start: i, end: i + period.step}));
      const periodLength = period.end - period.start;
      lastPeriod.push(this.getPeriodCount(entity, {start: i - periodLength, end: i - periodLength + period.step}));
    }

    const datasets = [
      {values: lastPeriod, title: 'Last period ➡'},
      {values: thisPeriod, title: 'This period'}
    ];

    if (!context.chart) {
      context.chart = new Chart({
        parent: elm,
        data: {labels, datasets},
        type: 'line',
        height: 200,
        x_axis_mode: 'tick',  // for short label ticks
        y_axis_mode: 'span',  // for long horizontal lines, or 'tick'
        is_series: 1,
        show_dots: 0,
        colors: ['rgba(0,0,0,0.2)', app.forum.attribute('themePrimaryColor')],
        format_tooltip_x: d => d,
        format_tooltip_y: d => d
      });
    }

    context.chart.update_values(
      datasets,
      labels
    );
  }

  changeEntity(entity) {
    this.selectedEntity = entity;
  }

  changePeriod(period) {
    this.selectedPeriod = period;
  }

  getTotalCount(entity) {
    return app.data.statistics[entity].total;
  }

  getPeriodCount(entity, period) {
    const daily = app.data.statistics[entity].daily;
    let count = 0;

    for (const day in daily) {
      const date = new Date(day);

      if (date > period.start && date < period.end) {
        count += daily[day];
      }
    }

    return count;
  }

  getLastPeriod(thisPeriod) {
    return {
      start: thisPeriod.start - (thisPeriod.end - thisPeriod.start),
      end: thisPeriod.start
    };
  }
}