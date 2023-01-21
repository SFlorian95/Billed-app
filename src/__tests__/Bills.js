/**
 * @jest-environment jsdom
 */

import { fireEvent, screen, waitFor } from "@testing-library/dom"
import userEvent from '@testing-library/user-event'
import mockStore from "../__mocks__/store"
import BillsUI from "../views/BillsUI.js"
import { bills, fakeDateBills, nullStatusBills } from "../fixtures/bills.js"
import { ROUTES, ROUTES_PATH } from "../constants/routes.js"
import { localStorageMock } from "../__mocks__/localStorage.js"
import router from "../app/Router.js"
import Bills from "../containers/Bills.js"

import { formatDate, formatStatus } from "../app/format.js"

jest.mock("../app/store", () => mockStore)


describe("Given I am connected as an employee", () => {
  beforeAll(() => {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock })
    window.localStorage.setItem('user', JSON.stringify({
      type: 'Employee'
    }))
    const root = document.createElement("div")
    root.setAttribute("id", "root")
    document.body.append(root)
    router()
  })
  describe("When I am on Bills Page", () => {
    test("Then fetches bills from mock API GET", async () => {
      window.onNavigate(ROUTES_PATH.Bills)
      const iconEyes = await waitFor(() => screen.getAllByTestId('icon-eye'))
      expect(iconEyes.length).toEqual((await mockStore.bills().list()).length)
    })
    test("Then bill icon in vertical layout should be highlighted", async () => {
      window.onNavigate(ROUTES_PATH.Bills)
      const windowIcon = await waitFor(() => screen.getByTestId('icon-window'))
      expect(windowIcon.getAttribute('class')).toEqual('active-icon')
    })
    test("Then bills should be ordered from earliest to latest", () => {
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname })
      }
      const store = mockStore
      const bill = new Bills({
        document, onNavigate, store, bills, localStorage: window.localStorage
      })

      document.body.innerHTML = BillsUI({ data: bills.sort(bill.byDESCDate) })
      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML)
      const antiChrono = (a, b) => ((a < b) ? 1 : -1)
      const datesSorted = [...dates].sort(antiChrono)
      expect(dates).toEqual(datesSorted)
    })
    describe("When I click on 'new bill button'", () => {
      test("Then i should be sent on New Bill page", async () => {
        document.body.innerHTML = BillsUI({ data: bills })

        const onNavigate = (pathname) => {
          document.body.innerHTML = ROUTES({ pathname })
        }
        const store = null
        const bill = new Bills({
          document, onNavigate, store, bills, localStorage: window.localStorage
        })

        const buttonNewBill = screen.getByTestId('btn-new-bill')
        const handleClickNewBill = jest.fn(e => bill.handleClickNewBill(e))
        buttonNewBill.addEventListener('click', handleClickNewBill)
        fireEvent.click(buttonNewBill)
        expect(handleClickNewBill).toHaveBeenCalled()
        const formNewBill = await waitFor(() => screen.getByTestId('form-new-bill'))
        expect(formNewBill).toBeTruthy()
      })
    })
    describe("When I click on the first icon eye", () => {
      test("Then a modal should open including bill proof", async () => {
        document.body.innerHTML = BillsUI({ data: [bills[0]] })

        const onNavigate = (pathname) => {
          document.body.innerHTML = ROUTES({ pathname })
        }
        const store = null
        const bill = new Bills({
          document, onNavigate, store, bills, localStorage: window.localStorage
        })

        const iconEyes = screen.getAllByTestId('icon-eye')

        const handleClickIconEye = jest.fn(() => bill.handleClickIconEye(iconEyes[0]))
        iconEyes[0].addEventListener('click', handleClickIconEye)
        userEvent.click(iconEyes[0])
        expect(handleClickIconEye).toHaveBeenCalled()

        const openBillUrl = await waitFor(() => screen.getByTestId(`open-${bills[0].fileUrl}`))
        expect(openBillUrl).toBeTruthy()
      })
    })
    describe("Test Class method computedBills()", () => {
      it("should return bills with date not formatted when corrupted data is introduced", () => {
        const onNavigate = (pathname) => {
          document.body.innerHTML = ROUTES({ pathname })
        }
        const store = mockStore
        const bill = new Bills({
          document, onNavigate, store, bills, localStorage: window.localStorage
        })

        const result = bill.computedBills(fakeDateBills)
        expect(result[0].date).toEqual('fake')
      })
      it("should return bills with date properly formatted when not corrupted data is introduced", () => {
        const onNavigate = (pathname) => {
          document.body.innerHTML = ROUTES({ pathname })
        }
        const store = mockStore
        const bill = new Bills({
          document, onNavigate, store, bills, localStorage: window.localStorage
        })

        const result = bill.computedBills([bills[0]])
        expect(result[0].date).toEqual(formatDate(bills[0].date))
      })
      it("should return filtered bills without status equal to null", () => {
        const onNavigate = (pathname) => {
          document.body.innerHTML = ROUTES({ pathname })
        }
        const store = mockStore
        const bill = new Bills({
          document, onNavigate, store, bills, localStorage: window.localStorage
        })

        const result = bill.computedBills(nullStatusBills)
        expect(result).toEqual(nullStatusBills.filter(bill.byStatusNotNull))
      })
      it("should return sorted bills from earliest to latest", () => {
        const onNavigate = (pathname) => {
          document.body.innerHTML = ROUTES({ pathname })
        }
        const store = mockStore
        const bill = new Bills({
          document, onNavigate, store, bills, localStorage: window.localStorage
        })

        const result = bill.computedBills(bills)
        expect(result).toEqual(bills.sort(bill.byDESCDate).map(item => {
          return {
            ...item,
            date: formatDate(item.date),
            status: formatStatus(item.status)
          }
        }))
      })
    })
  })
})

describe("When an error occurs on API", () => {
  beforeEach(() => {
    jest.spyOn(mockStore, "bills")
    Object.defineProperty(
      window,
      'localStorage',
      { value: localStorageMock }
    )
    window.localStorage.setItem('user', JSON.stringify({
      type: 'Employee'
    }))
    const root = document.createElement("div")
    root.setAttribute("id", "root")
    document.body.appendChild(root)
    router()
  })
  afterEach(() => document.body.innerHTML = "")
  test("fetches bills from an API and fails with 404 message error", async () => {

    mockStore.bills.mockImplementationOnce(() => {
      return {
        list: () => {
          return Promise.reject(new Error("Erreur 404"))
        }
      }
    })
    window.onNavigate(ROUTES_PATH.Bills)
    await new Promise(process.nextTick);
    const message = await screen.getByText(/Erreur 404/)
    expect(message).toBeTruthy()
  })
  test("fetches bills from an API and fails with 500 message error", async () => {

    mockStore.bills.mockImplementationOnce(() => {
      return {
        list: () => {
          return Promise.reject(new Error("Erreur 500"))
        }
      }
    })

    window.onNavigate(ROUTES_PATH.Bills)
    await new Promise(process.nextTick);
    const message = await screen.getByText(/Erreur 500/)
    expect(message).toBeTruthy()
  })
})
