export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/booking/index',
    'pages/approval/index',
    'pages/mine/index',
    'pages/cage-detail/index',
    'pages/booking-detail/index',
    'pages/approval-detail/index',
    'pages/create-booking/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: '动物房预约',
    navigationBarTextStyle: 'black',
    backgroundColor: '#f0f9ff'
  },
  tabBar: {
    color: '#94a3b8',
    selectedColor: '#0ea5e9',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '笼位排期'
      },
      {
        pagePath: 'pages/booking/index',
        text: '我的预约'
      },
      {
        pagePath: 'pages/approval/index',
        text: '审批中心'
      },
      {
        pagePath: 'pages/mine/index',
        text: '个人中心'
      }
    ]
  }
})
