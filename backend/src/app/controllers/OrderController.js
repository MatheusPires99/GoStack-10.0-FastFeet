import * as Yup from "yup";

import {
  startOfHour,
  setHours,
  isBefore,
  isWithinInterval,
  parseISO,
} from "date-fns";

import Order from "../models/Order";
import Recipient from "../models/Recipient";
import Deliveryman from "../models/Deliveryman";
import File from "../models/File";
import Notification from "../schemas/Notification";

class OrderController {
  async index(req, res) {
    const { page = 1 } = req.query;

    const order = await Order.findAll({
      attributes: {
        exclude: ["createdAt", "updatedAt"],
      },
      order: ["start_date"],
      limit: 10,
      offset: (page - 1) * 20,
      include: [
        {
          model: Recipient,
          as: "recipient",
          attributes: {
            exclude: ["createdAt", "updatedAt"],
          },
        },
        {
          model: Deliveryman,
          as: "deliveryman",
          attributes: {
            exclude: ["createdAt", "updatedAt"],
          },
          include: [
            {
              model: File,
              as: "avatar",
              attributes: ["id", "path", "url"],
            },
          ],
        },
        {
          model: File,
          as: "signature",
          attributes: ["id", "path", "url"],
        },
      ],
    });

    return res.json(order);
  }

  // async show(res, req) {
  //   const order = await Order.findByPk(req.params.id);

  //   if (!order) {
  //     return res.status(401).json({ error: "Order not found" });
  //   }

  //   return res.json(order);
  // }

  async store(req, res) {
    const schema = Yup.object().shape({
      product: Yup.string().required(),
      recipient_id: Yup.number().required(),
      deliveryman_id: Yup.number().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: "Field validation fails" });
    }

    const { recipient_id } = req.body;

    const recipientExist = await Recipient.findByPk(recipient_id);

    if (!recipientExist) {
      return res.status(401).json({ error: "Recipient does not exist" });
    }

    const { deliveryman_id } = req.body;

    const deliverymanExist = await Deliveryman.findByPk(
      req.body.deliveryman_id
    );

    if (!deliverymanExist) {
      return res.status(401).json({ error: "Deliveryman does not exist" });
    }

    const { id, product } = req.body;

    const order = await Order.create({
      id,
      product,
      recipient_id,
      deliveryman_id,
    });

    // Notify deliveryman
    const recipient = await Recipient.findByPk(recipient_id);

    await Notification.create({
      content: `Nova entrega de ${recipient.name}`,
      user: deliveryman_id,
    });

    return res.json(order);
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      deliveryman_id: Yup.number(),
      canceled_at: Yup.date(),
      start_date: Yup.date(),
      end_date: Yup.date(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(401).json({ error: "Validation fail" });
    }

    const order = await Order.findByPk(req.params.id);

    const { start_date, end_date } = req.body;

    if (!start_date) {
      return res.status(400).json({ error: "Invalid start date" });
    }

    const formattedStartDate = startOfHour(parseISO(start_date));
    const formattedEndDate = startOfHour(parseISO(end_date));

    if (isBefore(formattedStartDate, new Date())) {
      return res.status(400).json({ error: "Past dates are not permitted" });
    }

    const start_hour = setHours(new Date(), 8);
    const end_hour = setHours(new Date(), 18);

    if (
      !isWithinInterval(formattedStartDate, {
        start: start_hour,
        end: end_hour,
      })
    ) {
      return res.status(400).json({
        error: "You can only withdraw and order between 08:00 and 18:00",
      });
    }

    if (isBefore(formattedEndDate, formattedStartDate)) {
      return res
        .status(401)
        .json({ error: "The start date must be before end date" });
    }

    const { id, product } = await order.update(req.body);

    return res.json({ id, product, formattedStartDate, formattedEndDate });
  }
}

export default new OrderController();