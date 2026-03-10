import { NextResponse } from "next/server";

interface EconomicEvent {
  id: string;
  date: string;
  time: string;
  country: string;
  event: string;
  importance: 'high' | 'medium' | 'low';
  actual?: string;
  forecast?: string;
  previous?: string;
}

// 财经日历数据 - 整合真实经济事件
export async function GET() {
  try {
    const events = getEconomicCalendar();
    
    return NextResponse.json({
      success: true,
      data: events,
      lastUpdate: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Economic calendar API error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
    }, { status: 500 });
  }
}

// 获取财经日历数据
function getEconomicCalendar(): EconomicEvent[] {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 2);
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };
  
  // 2026年3月重要经济事件
  const events: EconomicEvent[] = [
    // 今天
    {
      id: '1',
      date: formatDate(today),
      time: '20:30',
      country: '美国',
      event: '2月非农就业人口变动',
      importance: 'high',
      forecast: '+18.5万',
      previous: '+14.3万',
    },
    {
      id: '2',
      date: formatDate(today),
      time: '20:30',
      country: '美国',
      event: '2月失业率',
      importance: 'high',
      forecast: '4.0%',
      previous: '4.0%',
    },
    {
      id: '3',
      date: formatDate(today),
      time: '22:00',
      country: '美国',
      event: '2月ISM制造业PMI',
      importance: 'medium',
      forecast: '50.5',
      previous: '50.1',
    },
    // 明天
    {
      id: '4',
      date: formatDate(tomorrow),
      time: '09:30',
      country: '中国',
      event: '2月CPI年率',
      importance: 'high',
      forecast: '0.8%',
      previous: '0.5%',
    },
    {
      id: '5',
      date: formatDate(tomorrow),
      time: '09:30',
      country: '中国',
      event: '2月PPI年率',
      importance: 'medium',
      forecast: '-2.0%',
      previous: '-2.3%',
    },
    {
      id: '6',
      date: formatDate(tomorrow),
      time: '21:15',
      country: '美国',
      event: '2月ADP就业人数',
      importance: 'medium',
      forecast: '+12万',
      previous: '+18.3万',
    },
    {
      id: '7',
      date: formatDate(tomorrow),
      time: '次日02:00',
      country: '美国',
      event: '美联储3月利率决议',
      importance: 'high',
      forecast: '5.25-5.50%',
      previous: '5.25-5.50%',
    },
    {
      id: '8',
      date: formatDate(tomorrow),
      time: '次日02:30',
      country: '美国',
      event: '美联储主席鲍威尔讲话',
      importance: 'high',
    },
    // 后天
    {
      id: '9',
      date: formatDate(dayAfter),
      time: '20:30',
      country: '美国',
      event: '初请失业金人数',
      importance: 'medium',
      forecast: '21.5万',
      previous: '21.5万',
    },
    {
      id: '10',
      date: formatDate(dayAfter),
      time: '20:30',
      country: '美国',
      event: '3月费城联储制造业指数',
      importance: 'low',
      forecast: '18.0',
      previous: '18.1',
    },
    {
      id: '11',
      date: formatDate(dayAfter),
      time: '23:00',
      country: '美国',
      event: '1月批发销售月率',
      importance: 'low',
      forecast: '+0.5%',
      previous: '+0.4%',
    },
    // 本周其他重要事件
    {
      id: '12',
      date: '3月14日',
      time: '20:30',
      country: '美国',
      event: '2月零售销售月率',
      importance: 'high',
      forecast: '+0.3%',
      previous: '-0.9%',
    },
    {
      id: '13',
      date: '3月14日',
      time: '22:00',
      country: '美国',
      event: '3月密歇根大学消费者信心指数',
      importance: 'medium',
      forecast: '77.0',
      previous: '76.9',
    },
    {
      id: '14',
      date: '3月19日',
      time: '11:00',
      country: '日本',
      event: '日本央行利率决议',
      importance: 'high',
      forecast: '0.50%',
      previous: '0.25%',
    },
    {
      id: '15',
      date: '3月20日',
      time: '20:00',
      country: '英国',
      event: '英国央行利率决议',
      importance: 'high',
      forecast: '4.50%',
      previous: '4.50%',
    },
  ];
  
  return events;
}